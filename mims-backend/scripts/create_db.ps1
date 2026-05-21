#!/usr/bin/env pwsh
# Creates the PostgreSQL database and user based on mims-backend/.env

function Unquote([string]$s){
    if ($null -eq $s) { return $null }
    return $s.Trim() -replace '^"','' -replace '"$',''
}

# Determine script and repository locations robustly
$scriptFolder = $null
if ($PSScriptRoot) { $scriptFolder = $PSScriptRoot }
elseif ($MyInvocation -and $MyInvocation.MyCommand.Path) { $scriptFolder = Split-Path -Parent $MyInvocation.MyCommand.Path }
if (-not $scriptFolder) { $scriptFolder = (Get-Location).Path }

# repository root is assumed to be the parent of the scripts folder
$repoRoot = Split-Path -Parent $scriptFolder

# candidate locations for .env (repo root, script folder, current working dir)
$envPathCandidates = @(
    Join-Path -Path $repoRoot -ChildPath '.env'
    Join-Path -Path $scriptFolder -ChildPath '.env'
    Join-Path -Path (Get-Location).Path -ChildPath '.env'
)

$envPath = $envPathCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $envPath) {
    Write-Error "Could not find .env at expected locations. Checked: $($envPathCandidates -join ', ' )."
    exit 1
}

Write-Host "Using .env file: $envPath"

# Read and parse .env into a hashtable (split on first '='), ignore blank lines and comments
$content = Get-Content $envPath -Encoding UTF8 -Raw
$envHash = @{}
foreach ($rawLine in ($content -split "`r?`n")){
    $line = $rawLine.Trim()
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    if ($line.StartsWith('#')) { continue }
    $idx = $line.IndexOf('=')
    if ($idx -lt 0) { continue }
    $key = $line.Substring(0,$idx).Trim()
    $val = $line.Substring($idx+1).Trim()
    if ($val.Length -ge 2 -and (($val.StartsWith('"') -and $val.EndsWith('"')) -or ($val.StartsWith("'") -and $val.EndsWith("'")))){
        $val = $val.Substring(1,$val.Length-2)
    }
    $envHash[$key] = $val
}

$dbHost = $envHash['DB_HOST']
$dbPort = $envHash['DB_PORT']
$dbName = $envHash['DB_DATABASE']
$dbUser = $envHash['DB_USERNAME']
$dbPass = $envHash['DB_PASSWORD']

$missing = @()
foreach ($k in @('DB_HOST','DB_PORT','DB_DATABASE','DB_USERNAME')){
    if ([string]::IsNullOrWhiteSpace($envHash[$k])){ $missing += $k }
}
if ($missing.Count -gt 0){
    Write-Error "Missing DB configuration in .env. Please ensure these keys are set: $($missing -join ', ')"
    exit 1
}

# Find psql executable (try PATH first, then common locations)
$psqlExe = $null
if (Get-Command psql -ErrorAction SilentlyContinue){
    $psqlExe = (Get-Command psql).Source
} else {
    $commonPaths = @(
        'C:\Program Files\PostgreSQL\18\bin\psql.exe',
        'C:\Program Files\PostgreSQL\17\bin\psql.exe',
        'C:\Program Files\PostgreSQL\16\bin\psql.exe',
        'C:\Program Files\PostgreSQL\15\bin\psql.exe'
    )
    $psqlExe = $commonPaths | Where-Object { Test-Path $_ } | Select-Object -First 1
}

if (-not $psqlExe){
    Write-Error "psql not found. Install PostgreSQL (with bin tools) or add its bin folder to PATH."
    exit 1
}

Write-Host "Using psql: $psqlExe"

$adminUser = Read-Host "Postgres admin username (default: postgres)"
if ([string]::IsNullOrWhiteSpace($adminUser)) { $adminUser = 'postgres' }

$adminPassSecure = Read-Host "Postgres admin password (input hidden)" -AsSecureString
$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminPassSecure)
$adminPass = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)

$env:PGPASSWORD = $adminPass

function Run-PSQL($query){
    & $psqlExe -h $dbHost -p $dbPort -U $adminUser -v ON_ERROR_STOP=1 -c $query
}

try{
    Write-Host "Checking if role '$dbUser' exists..."
    $roleCheck = & $psqlExe -h $dbHost -p $dbPort -U $adminUser -tAc "SELECT 1 FROM pg_roles WHERE rolname='$dbUser'" 2>&1
    if (-not $roleCheck -or ($roleCheck -as [string]).Trim() -ne '1'){
        Write-Host "Creating role '$dbUser'..."
        $pwEscaped = $dbPass -replace "'","''"
        Run-PSQL "CREATE ROLE ""$dbUser"" WITH LOGIN PASSWORD '$pwEscaped';"
    } else {
        Write-Host "Role '$dbUser' already exists. Skipping role creation."
    }

    Write-Host "Checking if database '$dbName' exists..."
    $dbCheck = & $psqlExe -h $dbHost -p $dbPort -U $adminUser -tAc "SELECT 1 FROM pg_database WHERE datname='$dbName'" 2>&1
    if (-not $dbCheck -or ($dbCheck -as [string]).Trim() -ne '1'){
        Write-Host "Creating database '$dbName' owned by '$dbUser'..."
        Run-PSQL "CREATE DATABASE ""$dbName"" OWNER ""$dbUser"";"
    } else {
        Write-Host "Database '$dbName' already exists. Skipping database creation."
    }

    Write-Host "Granting all privileges on database '$dbName' to '$dbUser'..."
    Run-PSQL "GRANT ALL PRIVILEGES ON DATABASE ""$dbName"" TO ""$dbUser"";"

    Write-Host "Done."
} catch {
    Write-Error "An error occurred: $_"
    exit 1
} finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
