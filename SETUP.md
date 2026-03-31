# Mzuzu Inmate Management System (MIMS) - Setup Guide

Welcome to the Mzuzu Inmate Management System project! This guide will help you set up the project from scratch.

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [System Requirements](#system-requirements)
3. [Prerequisites](#prerequisites)
4. [Project Structure](#project-structure)
5. [Backend Setup](#backend-setup)
6. [Frontend Setup](#frontend-setup)
7. [Running the Application](#running-the-application)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Project Overview

The **Mzuzu Inmate Management System (MIMS)** is a comprehensive web application designed for prison inmate management operations. It features:

- **Token-based authentication** with Sanctum API authentication
- **Role-based access control** (Admin, Reception Officer, Station Officer, Officer on Duty, Gatekeeper)
- **Modern React 19 frontend** with Tailwind CSS styling
- **High-performance Laravel Octane backend** with FrankenPHP, RoadRunner, or Swoole
- **Component-driven development** with Storybook documentation
- **Comprehensive testing** with Vitest and Playwright E2E tests

### Technology Stack

**Backend:**
- PHP 8.2+
- Laravel 12.0
- Laravel Octane with FrankenPHP (recommended), RoadRunner, or Swoole
- Laravel Sanctum (token-based API authentication)
- Spiral/Roadrunner 2025.1
- PostgreSQL database (production and development)
- SQLite database (testing)
- PHPUnit testing framework
- Laravel Pail (logging)
- Laravel Pint (code style)

**Frontend:**
- React 19.2.0
- Vite 7.3.1 (build tool)
- Redux Toolkit 2.6.1 (state management)
- React Router DOM v7 (routing)
- React Hook Form 7.55.0 (form handling)
- Zod 3.24.3 (schema validation)
- Axios 1.7.9 (HTTP client)
- Tailwind CSS 3.4.19 (styling)
- Storybook 10.3.3 (component documentation)
- Vitest 4.1.2 (unit testing)
- Playwright 1.58.2 (E2E testing)
- ESLint with React plugins (linting)

---

## ⚙️ System Requirements

Before you begin, ensure your system meets these requirements:

### Backend Requirements
- **PHP**: 8.2 or higher
- **Composer**: Latest version (for PHP dependency management)
- **PostgreSQL**: 12 or higher (for development database)
- **SQLite**: Included with PHP (for testing)
- **Git**: For cloning the repository
- **Node.js & npm**: Required for running frontend build tools alongside backend

### Frontend Requirements
- **Node.js**: 16.0 or higher
- **npm**: 7.0 or higher (comes with Node.js)
- **Git**: For cloning the repository

### Optional (for Production/Advanced Use)
- **FrankenPHP**: For production Laravel Octane deployment (recommended)
- **RoadRunner**: Alternative high-performance server for Laravel Octane
- **Swoole**: Alternative high-performance server (requires PHP extension)
- **Docker & Docker Compose**: For containerized development and database management
- **pgAdmin or DBeaver**: PostgreSQL management tools (optional but useful)

### Tested Environments
- Linux (Ubuntu/Debian)
- macOS
- Windows (with WSL2 recommended)

---

## 📦 Prerequisites

### 1. Install Git
If you don't have Git installed, download it from [git-scm.com](https://git-scm.com)

### 2. Install PHP 8.2+

**macOS (Homebrew):**
```bash
brew install php
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install php8.2 php8.2-cli php8.2-mbstring php8.2-xml php8.2-json php8.2-sqlite3 php8.2-curl php8.2-pgsql
```

**Windows:**
Download from [php.net](https://www.php.net/downloads)

**Verify installation:**
```bash
php --version
```

### 3. Install PostgreSQL 12+

The project uses PostgreSQL for the development database.

**macOS (Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download installer from [postgresql.org](https://www.postgresql.org/download/windows/)

**Verify installation:**
```bash
psql --version
psql -U postgres -c "SELECT version();"
```

**Create Development Database:**
```bash
psql -U postgres

# In PostgreSQL shell:
CREATE DATABASE mims_db;
CREATE USER mims WITH PASSWORD 'your_password';
ALTER ROLE mims SET client_encoding TO 'utf8';
ALTER ROLE mims SET default_transaction_isolation TO 'read committed';
GRANT ALL PRIVILEGES ON DATABASE mims_db TO mims;
\q
```

### 4. Install Composer

Download from [getcomposer.org](https://getcomposer.org/download/) or use package manager:

**macOS (Homebrew):**
```bash
brew install composer
```

**Ubuntu/Debian:**
```bash
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
```

**Verify installation:**
```bash
composer --version
```

### 5. Install Node.js and npm

Download LTS version from [nodejs.org](https://nodejs.org/) or use package manager:

**macOS (Homebrew):**
```bash
brew install node
```

**Ubuntu/Debian:**
```bash
sudo apt-get install nodejs npm
```

**Verify installation:**
```bash
node --version  # Should be 16.0 or higher
npm --version   # Should be 7.0 or higher
```

### 6. (Optional) Version Managers

For managing multiple PHP/Node versions:

**NVM (Node Version Manager) - Linux/macOS:**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18  # Install specific Node version
```

**Homebrew (macOS):**
```bash
brew install php@8.2
```

---

## 📁 Project Structure

```
Prison-project/
├── mims-backend/          # Laravel backend API
│   ├── app/              # Application code
│   ├── config/           # Configuration files
│   ├── database/         # Migrations and seeds
│   ├── routes/           # API routes
│   ├── tests/            # Unit and feature tests
│   └── composer.json     # PHP dependencies
├── MIMS-FRONTEND/        # React frontend application
│   ├── src/              # Frontend source code
│   ├── public/           # Static assets
│   ├── package.json      # JavaScript dependencies
│   └── vite.config.js    # Vite build configuration
└── SETUP.md              # This file
```

---

## 🔧 Backend Setup

### Quick Setup (Recommended)

The project includes a convenient setup script:

```bash
cd mims-backend
composer setup
```

This command automatically:
1. Installs PHP dependencies
2. Creates `.env` file from `.env.example`
3. Generates the application key
4. Runs database migrations
5. Installs frontend dependencies
6. Builds frontend assets

**This is the fastest way to get everything running!**

### Manual Setup (If needed)

If the quick setup doesn't work, follow these steps:

#### Step 1: Clone the Repository

```bash
git clone https://github.com/Elton726/Mzuzu-Inmate-Management-System.git
cd Mzuzu-Inmate-Management-System
```

#### Step 2: Navigate to Backend Directory

```bash
cd mims-backend
```

#### Step 3: Install PHP Dependencies

```bash
composer install
```

This installs all required PHP packages including:
- Laravel 12.0
- Laravel Octane
- Laravel Sanctum (authentication)
- Testing frameworks

#### Step 4: Create Environment Configuration

```bash
cp .env.example .env
```

Edit the `.env` file with your PostgreSQL settings:

```env
APP_NAME="MIMS"
APP_ENV=local
APP_KEY=                    # Will be generated in next step
APP_DEBUG=true
APP_URL=http://localhost

# PostgreSQL Database Configuration (Development)
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=mims_db
DB_USERNAME=postgres
DB_PASSWORD=your_password

# Session & Queue Configuration
SESSION_DRIVER=database
QUEUE_CONNECTION=database
CACHE_STORE=database

# Laravel Octane Configuration
OCTANE_SERVER=frankenphp
OCTANE_HOST=127.0.0.1
OCTANE_PORT=8000
OCTANE_WORKERS=auto
OCTANE_WATCH=true
```

**Database Setup Options:**

**Option A: Using Docker (Recommended)**
If you have Docker installed, run PostgreSQL in a container:

```bash
# Create a docker-compose.yml in mims-backend directory
docker-compose up -d
```

**Option B: Local PostgreSQL Installation**

- **macOS**: `brew install postgresql@15`
- **Ubuntu/Debian**: `sudo apt-get install postgresql`
- **Windows**: Download from [postgresql.org](https://www.postgresql.org/download/)

Create the database:
```bash
# Connect to PostgreSQL
psql -U postgres

# In PostgreSQL shell:
CREATE DATABASE mims_db;
CREATE USER mims WITH PASSWORD 'your_password';
ALTER ROLE mims SET client_encoding TO 'utf8';
ALTER ROLE mims SET default_transaction_isolation TO 'read committed';
GRANT ALL PRIVILEGES ON DATABASE mims_db TO mims;
\q
```

**Option C: Using PostgreSQL via Cloud**
If using a cloud PostgreSQL service (AWS RDS, Heroku, etc.), update your credentials in `.env`.

#### Step 5: Generate Application Key

```bash
php artisan key:generate
```

This creates a unique encryption key for your application.

#### Step 6: Run Database Migrations

```bash
php artisan migrate
```

This creates the necessary database tables and schema in your PostgreSQL database.

**If migration fails**, ensure:
1. PostgreSQL is running (`psql -U postgres` in terminal)
2. Database and user are created (see Step 4 options above)
3. Database credentials in `.env` are correct
4. PHP PostgreSQL extension is installed: `php -m | grep pdo_pgsql`

#### Step 7: (Optional) Seed Sample Data

```bash
php artisan db:seed
```

This populates the database with sample data for testing.

---

## 🎨 Frontend Setup

If you used `composer setup` in the backend, the frontend is already set up. Otherwise, follow these steps:

### Step 1: Navigate to Frontend Directory

From the project root:

```bash
cd MIMS-FRONTEND
```

### Step 2: Install JavaScript Dependencies

```bash
npm install
```

This installs all required Node.js packages including:
- React 19.2.0 and React DOM
- Vite build tool
- Redux Toolkit for state management
- React Router, Hook Form, Zod validation
- Tailwind CSS
- Testing tools (Vitest, Playwright)
- Storybook for component documentation

### Step 3: Environment Configuration (Optional)

The frontend works out of the box with the default backend URL. If your backend is on a different URL, create a `.env.local` file:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

This is optional as the frontend defaults to `http://localhost:8000/api`.

---

## 🚀 Running the Application

To run the complete application, you'll need two terminal windows/tabs:

### Terminal 1 - Backend Server

```bash
cd mims-backend
php artisan serve
```

The backend will run at `http://localhost:8000`

### Terminal 2 - Frontend Development Server

```bash
cd MIMS-FRONTEND
npm run dev
```

The frontend will run at `http://localhost:5173`

### Access the Application

Open your web browser and navigate to:
```
http://localhost:5173
```

---

## 🧪 Testing

### Backend Testing Database Configuration

The project uses **SQLite for testing** to keep tests fast and isolated. Configure your test environment:

Create a `.env.testing` file in `mims-backend/`:

```env
APP_ENV=testing
DB_CONNECTION=sqlite
DB_DATABASE=:memory:
```

Or use in-memory SQLite (fastest for testing):

```bash
# In phpunit.xml, the testing database is configured to use SQLite
# Tests run with an in-memory database for speed and isolation
```

### Running Backend Tests

Run the test suite with PHPUnit:

```bash
cd mims-backend
composer test
```

This command:
1. Clears configuration cache
2. Uses SQLite in-memory database for tests
3. Runs all PHPUnit tests
4. Returns detailed test results

Tests are isolated and don't affect your PostgreSQL development database.

### Frontend Unit Tests

Run Vitest for component and utility tests:

```bash
cd MIMS-FRONTEND
npm run test        # Run tests (if script is available)
```

### Frontend Component Testing with Storybook

Storybook is included for component documentation and testing:

```bash
cd MIMS-FRONTEND
npm run storybook
```

This opens Storybook at `http://localhost:6006` where you can:
- View component documentation
- Test components in isolation
- Run visual regression tests
- Test accessibility (a11y)

Build Storybook for production:
```bash
npm run build-storybook
```

### E2E Testing

Playwright is configured for end-to-end testing. Run tests with:

```bash
cd MIMS-FRONTEND
npm run test:e2e     # (if configured)
```

### Code Quality

**Frontend Linting:**
```bash
cd MIMS-FRONTEND
npm run lint
```

**Backend Code Style:**
```bash
cd mims-backend
php artisan pint     # Fix code style issues
```

---

## 📦 Building for Production

### Frontend Build

Create an optimized production build:

```bash
cd MIMS-FRONTEND
npm run build
```

This creates a `dist/` directory with optimized assets ready for deployment.

Preview the production build:
```bash
npm run preview
```

### Backend Optimization

For production deployment:

```bash
cd mims-backend
php artisan config:cache    # Cache configuration
php artisan route:cache     # Cache routes
php artisan view:cache      # Cache views
php artisan octane:start    # Start Octane for high performance
```

---

## 🐛 Troubleshooting

### Common Issues and Solutions

#### 1. **`composer setup` or `composer install` Fails**

**Problem**: Composer returns errors about dependencies

**Solutions**:
```bash
# Clear composer cache
composer clear-cache

# Update composer itself
composer self-update

# Try installing with verbose output
composer install -vv

# Check PHP version
php --version

# Ensure PHP 8.2+ is installed and active
```

**If PHP version is incorrect**, install the right version:
```bash
# macOS (Homebrew)
brew install php@8.2

# Ubuntu/Debian
sudo apt-get install php8.2 php8.2-cli php8.2-mbstring php8.2-xml php8.2-json php8.2-sqlite3
```

#### 2. **`npm install` Fails**

**Problem**: npm returns errors or dependency conflicts

**Solutions**:
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and lock file, then reinstall
rm -rf node_modules package-lock.json
npm install

# Update npm and Node.js
npm install -g npm@latest
node --version  # Should be 16.0+
```

#### 3. **Database Connection Error / Migration Fails**

**Problem**: Migration errors, "SQLSTATE: FATAL", or "database does not exist"

**Solutions**:
```bash
# Verify PostgreSQL is running
psql -U postgres -c "SELECT version();"

# Check your .env database credentials
grep DB_ mims-backend/.env

# Verify the database exists
psql -U postgres -c "\l" | grep mims_db

# Recreate the database if needed
psql -U postgres
DROP DATABASE mims_db;
CREATE DATABASE mims_db;
CREATE USER mims WITH PASSWORD 'your_password';
ALTER ROLE mims SET client_encoding TO 'utf8';
ALTER ROLE mims SET default_transaction_isolation TO 'read committed';
GRANT ALL PRIVILEGES ON DATABASE mims_db TO mims;
\q

# Then run migrations again
php artisan migrate

# If using Docker PostgreSQL
docker-compose ps        # Check if PostgreSQL container is running
docker-compose logs db   # View PostgreSQL logs
```

**Check PHP PostgreSQL Extension**:
```bash
php -m | grep pdo_pgsql  # Should return pdo_pgsql

# If missing, install it:
# Ubuntu/Debian
sudo apt-get install php8.2-pgsql

# macOS (Homebrew)
brew install php@8.2 (includes PostgreSQL support)
```

#### 4. **Port Already in Use (8000 or 5173)**

**Problem**: "Address already in use" error when starting servers

**Solutions**:
```bash
# Find process using the port and kill it
# Linux/macOS
sudo lsof -ti:8000 | xargs kill -9
sudo lsof -ti:5173 | xargs kill -9

# Windows (in PowerShell)
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Or use different ports
php artisan serve --port=8001
npm run dev -- --port 5174
```

#### 5. **Composer Dev Command Fails**

**Problem**: `composer dev` command not working or giving errors

**Check prerequisites:**
```bash
# These must be installed for composer dev to work:
which php          # Should return path to PHP
which npm          # Should return path to npm
composer --version # Should show Composer version
npm --version      # Should show npm version
npx --version      # Should be available (comes with npm)
```

**Solution**: If any are missing, install them. If already installed but not found:
```bash
# For macOS (if using Homebrew)
brew install php composer node

# For Ubuntu/Debian
sudo apt-get install php composer nodejs npm
```

#### 6. **API Calls Return 401 (Unauthorized)**

**Problem**: Frontend can't authenticate with backend API

**Solutions**:
```bash
# Ensure both servers are running
# Check that backend is accessible at http://localhost:8000
# Open browser DevTools → Network → see if requests are going through

# Check Laravel Sanctum configuration in .env
grep SANCTUM .env

# The .env should have (adjust based on your frontend port)
# SANCTUM_STATEFUL_DOMAINS=localhost:5173

# Restart backend server after changing .env
```

#### 7. **CORS Errors in Browser Console**

**Problem**: "Access to XMLHttpRequest blocked by CORS"

**Solutions**:
```bash
# The issue is usually SANCTUM_STATEFUL_DOMAINS in .env

# Edit .env and ensure:
SANCTUM_STATEFUL_DOMAINS=localhost:5173

# If running on different ports:
SANCTUM_STATEFUL_DOMAINS=localhost:5173,localhost:3000

# Then restart the backend server
php artisan serve  # or composer dev
```

#### 8. **Frontend Not Loading or Blank Page**

**Problem**: React app not rendering or showing errors

**Check:**
1. Is the dev server running? (`npm run dev` output should show `http://localhost:5173`)
2. Open browser DevTools → Console tab for error messages
3. Check Network tab to see if JS files are loading

**Solutions**:
```bash
# Clear node_modules and reinstall
cd MIMS-FRONTEND
rm -rf node_modules package-lock.json
npm install

# Clear browser cache
# In browser DevTools, right-click refresh button → "Empty cache and hard refresh"

# Or disable cache in DevTools
# DevTools → Settings → Network → Disable caching (while DevTools open)

# Check for build errors
npm run build  # See if build succeeds
```

#### 9. **Laravel Octane Issues**

**Problem**: Octane server won't start or keeps restarting

**Solutions**:
```bash
# Check status
php artisan octane:status

# Stop all octane processes
php artisan octane:stop

# Check FrankenPHP is available (default octane server)
which frankenphp  # or check in /usr/local/bin/frankenphp

# Use simpler PHP server if octane has issues
php artisan serve --port=8000

# Check .env OCTANE settings
cat .env | grep OCTANE
```

If FrankenPHP isn't available for Octane:
```bash
# Change OCTANE_SERVER in .env to 'roadrunner' or skip octane during dev
# Use 'composer dev' or 'php artisan serve' instead
```

#### 10. **Storybook Won't Start**

**Problem**: Storybook fails to load or shows errors

**Solutions**:
```bash
cd MIMS-FRONTEND

# Clear storybook cache
rm -rf node_modules/.cache
npm cache clean --force

# Rebuild storybook
npm run build-storybook
npm run storybook
```

#### 11. **Module Not Found Errors in Frontend**

**Problem**: "Cannot find module 'X'" errors

**Solutions**:
```bash
cd MIMS-FRONTEND

# Make sure all dependencies are installed
npm install

# If specific module is missing
npm install <module-name>

# Check for conflicting versions in package.json
npm ls  # Shows dependency tree
```

#### 12. **Tests Failing or Test Command Not Found**

**Problem**: `composer test` fails or tests don't run

**Solutions**:
```bash
cd mims-backend

# Check if vendor/bin/phpunit exists
ls vendor/bin/phpunit

# Run tests directly
php vendor/bin/phpunit

# Or through artisan
php artisan test

# Check phpunit.xml configuration
cat phpunit.xml
```

---

## 📚 Additional Resources

### Official Documentation
- [Laravel 12 Documentation](https://laravel.com/docs/12.x)
- [Laravel Octane Documentation](https://laravel.com/docs/octane)
- [Laravel Sanctum Documentation](https://laravel.com/docs/sanctum)
- [React 19 Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [Redux Toolkit Documentation](https://redux-toolkit.js.org)
- [React Hook Form Documentation](https://react-hook-form.com)
- [Zod Documentation](https://zod.dev)

### Project-Specific Guides
- See `mims-backend/API_DOCUMENTATION.md` for API endpoints
- See `mims-backend/OCTANE_GUIDE.md` for Octane configuration
- See `mims-backend/RATE_LIMITING.md` for rate limiting setup
- See `MIMS-FRONTEND/README.md` for frontend architecture
- See `mims-backend/README.md` for backend architecture

### Useful Tools
- **Postman/Insomnia**: For API testing
- **VS Code Extensions**: ESLint, Prettier, PHP Intelephense, Laravel Extension Pack
- **Browser DevTools**: For debugging frontend
- **Storybook**: Component development (`npm run storybook`)

---

## 🤝 Getting Help

If you encounter issues:

1. **Check this troubleshooting section** - most common issues are documented
2. **Check project-specific documentation** - API_DOCUMENTATION.md, OCTANE_GUIDE.md
3. **Review browser console and network tab** - for frontend errors
4. **Review backend logs**:
   ```bash
   # View real-time logs
   php artisan pail
   
   # Or check log files
   tail -f mims-backend/storage/logs/laravel.log
   ```
5. **Check GitHub Issues** - Search for similar problems
6. **Review framework documentation** - Links above

---

## 📝 Important Notes

### Development Best Practices

1. **Environment Variables**: Never commit `.env` files. Use `.env.example` as template.
2. **Database**: 
   - **Development**: PostgreSQL for persistent data and development work
   - **Testing**: SQLite in-memory database for fast, isolated tests
3. **Authentication**: Uses Laravel Sanctum with token-based API authentication.
4. **Concurrency**: The `composer dev` command uses npm `concurrently` to manage multiple processes.
5. **Performance**: Use `composer dev` for quick development feedback with all tools running together.
6. **Production**: Use Laravel Octane (FrankenPHP) for production deployments.
7. **Testing**: Tests automatically use SQLite in-memory DB, keeping your PostgreSQL dev data clean.

### Security Tips

- Keep `.env` file secure and never commit it
- Regenerate `APP_KEY` in production: `php artisan key:generate`
- Review and update dependencies regularly: `composer outdated` and `npm outdated`
- Check for security vulnerabilities:
  ```bash
  composer audit        # Check PHP dependencies
  npm audit            # Check JavaScript dependencies
  ```

### Performance Optimization

**Frontend**:
```bash
npm run build  # Creates optimized production build
```

**Backend**:
```bash
# Use Laravel Octane for production
php artisan octane:start

# Cache configuration for performance
php artisan config:cache
php artisan route:cache
```

### Updating Dependencies

Keep your project up to date:

```bash
# PHP dependencies
cd mims-backend
composer update
composer outdated  # See available updates

# JavaScript dependencies
cd MIMS-FRONTEND
npm update
npm outdated  # See available updates
```

---

## 📋 Quick Reference Commands

### Backend Commands
```bash
cd mims-backend

# Development
composer dev                 # Run everything at once (recommended)
php artisan serve           # Just Laravel server
php artisan octane:start    # High-performance server

# Database
php artisan migrate         # Run migrations
php artisan migrate:fresh   # Reset and migrate
php artisan db:seed        # Seed database
php artisan tinker         # Interactive shell

# Testing & Quality
composer test              # Run PHPUnit tests
php artisan pint           # Fix code style
php artisan pail           # View logs

# Utilities
php artisan cache:clear    # Clear cache
php artisan config:clear   # Clear config cache
php artisan queue:listen   # Listen for queue jobs
```

### Frontend Commands
```bash
cd MIMS-FRONTEND

# Development
npm run dev                # Dev server
npm run build              # Production build
npm run preview            # Preview production build
npm run lint               # Run ESLint

# Component Development
npm run storybook          # Start Storybook
npm run build-storybook    # Build Storybook for deployment

# Testing
npm run test               # Run unit tests
npm run test:e2e          # Run E2E tests (if configured)
```

---

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] PHP 8.2+ installed: `php --version`
- [ ] PostgreSQL installed and running: `psql -U postgres -c "SELECT version();"`
- [ ] PostgreSQL database created: `psql -U postgres -c "\l" | grep mims_db`
- [ ] Composer installed: `composer --version`
- [ ] Node.js 16+ installed: `node --version`
- [ ] Backend dependencies installed: `cd mims-backend && ls vendor/`
- [ ] Frontend dependencies installed: `cd MIMS-FRONTEND && ls node_modules/`
- [ ] Laravel key generated: `grep APP_KEY=base64 mims-backend/.env`
- [ ] Database credentials in `.env`: `grep DB_ mims-backend/.env`
- [ ] Database migrations run: `cd mims-backend && php artisan migrate:status`
- [ ] Backend starts: `cd mims-backend && php artisan serve`
- [ ] Frontend starts: `cd MIMS-FRONTEND && npm run dev`
- [ ] Access frontend: `http://localhost:5173`
- [ ] Tests pass: `cd mims-backend && composer test`
- [ ] All features working properly

---

Happy coding! 🚀 If you have questions, review the troubleshooting section or check the project's GitHub repository for additional support.

