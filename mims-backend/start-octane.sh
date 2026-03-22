#!/bin/bash

# Laravel Octane Startup Script
# This script helps start Laravel Octane with different servers

set -e

echo "🚀 Starting Laravel Octane..."

# Check if we're in the right directory
if [ ! -f "artisan" ]; then
    echo "❌ Error: artisan file not found. Please run this script from the Laravel project root."
    exit 1
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Treat common truthy strings as "true".
is_truthy() {
    case "$(echo "${1:-}" | tr '[:upper:]' '[:lower:]')" in
        1|true|yes|y|on) return 0 ;;
        *) return 1 ;;
    esac
}

# Build common Octane CLI args from env.
build_octane_args() {
    local server="$1"

    OCTANE_ARGS=(octane:start "--server=${server}")

    # Bind configuration
    OCTANE_ARGS+=("--host=${OCTANE_HOST:-0.0.0.0}")
    OCTANE_ARGS+=("--port=${OCTANE_PORT:-8000}")

    if [ -n "${OCTANE_ADMIN_PORT:-}" ]; then
        OCTANE_ARGS+=("--admin-port=${OCTANE_ADMIN_PORT}")
    fi

    if [ -n "${OCTANE_RPC_HOST:-}" ]; then
        OCTANE_ARGS+=("--rpc-host=${OCTANE_RPC_HOST}")
    fi

    if [ -n "${OCTANE_RPC_PORT:-}" ]; then
        OCTANE_ARGS+=("--rpc-port=${OCTANE_RPC_PORT}")
    fi

    # Workers / limits
    if [ -n "${OCTANE_WORKERS:-}" ]; then
        OCTANE_ARGS+=("--workers=${OCTANE_WORKERS}")
    fi

    if [ -n "${OCTANE_TASK_WORKERS:-}" ]; then
        OCTANE_ARGS+=("--task-workers=${OCTANE_TASK_WORKERS}")
    fi

    if [ -n "${OCTANE_MAX_REQUESTS:-}" ]; then
        OCTANE_ARGS+=("--max-requests=${OCTANE_MAX_REQUESTS}")
    fi

    # Optional flags
    if is_truthy "${OCTANE_HTTPS:-}"; then
        OCTANE_ARGS+=("--https")
    fi

    if is_truthy "${OCTANE_WATCH:-}"; then
        OCTANE_ARGS+=("--watch")
    fi

    if [ -n "${OCTANE_LOG_LEVEL:-}" ]; then
        OCTANE_ARGS+=("--log-level=${OCTANE_LOG_LEVEL}")
    fi

    # Avoid formatting warnings from the vendor stub by using a project-owned Caddyfile if present.
    if [ -z "${OCTANE_CADDYFILE:-}" ] && [ -f "octane/Caddyfile" ]; then
        OCTANE_CADDYFILE="octane/Caddyfile"
    fi

    if [ -n "${OCTANE_RR_CONFIG:-}" ]; then
        OCTANE_ARGS+=("--rr-config=${OCTANE_RR_CONFIG}")
    fi

    if [ -n "${OCTANE_CADDYFILE:-}" ]; then
        OCTANE_ARGS+=("--caddyfile=${OCTANE_CADDYFILE}")
    fi
}

# Function to start with FrankenPHP
start_frankenphp() {
    echo "📦 Using FrankenPHP server..."

    # Prefer the project-local binary at ./frankenphp (this repo includes it).
    local FRANKENPHP_BIN="./frankenphp"
    if [ -x "$FRANKENPHP_BIN" ]; then
        export PATH="$(pwd):$PATH"
    elif ! command_exists "frankenphp"; then
        echo "⚠️  FrankenPHP binary not found (expected ./frankenphp or frankenphp on PATH)."
        echo "   If you want the script to install it automatically, ensure curl is available."
        if command_exists "curl"; then
            echo "📥 Installing FrankenPHP into the current directory..."
            curl -sSL https://get.frankenphp.dev | sh
            export PATH="$(pwd):$PATH"
        else
            echo "❌ Please install FrankenPHP manually: https://frankenphp.dev/docs/install/"
            exit 1
        fi
    fi

    echo "🔄 Starting FrankenPHP server..."
    build_octane_args "frankenphp"
    php artisan "${OCTANE_ARGS[@]}"
}

# Function to start with RoadRunner
start_roadrunner() {
    echo "🏃 Using RoadRunner server..."

    if ! command_exists "rr"; then
        echo "⚠️  RoadRunner binary not found. Installing..."
        # Try to install RoadRunner
        if command_exists "curl"; then
            curl -sSL https://roadrunner.dev/install.sh | sh
            export PATH="$HOME/.local/bin:$PATH"
        else
            echo "❌ Please install RoadRunner manually: https://roadrunner.dev/docs/getting-started/1-installation"
            exit 1
        fi
    fi

    echo "🔄 Starting RoadRunner server..."
    build_octane_args "roadrunner"
    php artisan "${OCTANE_ARGS[@]}"
}

# Function to start with Swoole
start_swoole() {
    echo "🌊 Using Swoole server..."

    if ! php -m | grep -q swoole; then
        echo "❌ Swoole extension not found. Please install it first:"
        echo "   Ubuntu/Debian: sudo apt install php-swoole"
        echo "   CentOS/RHEL: sudo yum install php-swoole"
        echo "   macOS: pecl install swoole"
        exit 1
    fi

    echo "🔄 Starting Swoole server..."
    build_octane_args "swoole"
    php artisan "${OCTANE_ARGS[@]}"
}

# Function to start with traditional PHP server (fallback)
start_php() {
    echo "🐘 Using traditional PHP development server..."
    echo "⚠️  Note: This is not Octane - for development only!"
    php artisan serve --host=0.0.0.0 --port=8000
}

# Determine which server to use
SERVER=${OCTANE_SERVER:-frankenphp}

case $SERVER in
    frankenphp)
        start_frankenphp
        ;;
    roadrunner)
        start_roadrunner
        ;;
    swoole)
        start_swoole
        ;;
    php)
        start_php
        ;;
    *)
        echo "❌ Unknown server: $SERVER"
        echo "Available options: frankenphp, roadrunner, swoole, php"
        exit 1
        ;;
esac
