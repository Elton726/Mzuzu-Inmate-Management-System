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
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Project Overview

The **Mzuzu Inmate Management System (MIMS)** is a comprehensive web application designed for prison inmate management operations. It features:

- **Role-based access control** for different staff members (Reception Officers, Station Officers, Administrators)
- **Modern React frontend** with Tailwind CSS styling
- **Robust PHP/Laravel backend** with API-first architecture
- **Database-driven** inmate tracking and management
- **Malawi government design standards**

### Technology Stack

**Backend:**
- PHP 8.2+
- Laravel 12
- Laravel Octane (high-performance server)
- SQLite or MySQL database
- Laravel Sanctum (API authentication)

**Frontend:**
- React 19.2.0
- Vite (build tool)
- Redux Toolkit (state management)
- Tailwind CSS (styling)
- React Router DOM v7
- Axios (HTTP client)

---

## ⚙️ System Requirements

Before you begin, ensure your system meets these requirements:

### Backend Requirements
- **PHP**: 8.2 or higher
- **Composer**: Latest version (for PHP dependency management)
- **Database**: SQLite (included) or MySQL 5.7+
- **Git**: For cloning the repository

### Frontend Requirements
- **Node.js**: 16.0 or higher
- **npm**: 7.0 or higher (comes with Node.js)
- **Git**: For cloning the repository

### Optional Tools
- **Docker** (if you want to use containerized development)
- **Database client** (MySQL Workbench, DBeaver, etc.) - for non-SQLite setups

---

## 📦 Prerequisites

### 1. Install Git
If you don't have Git installed, download it from [git-scm.com](https://git-scm.com)

### 2. Install PHP
- **On Windows/macOS**: Download from [php.net](https://www.php.net/downloads) or use Homebrew
- **On Linux**: Use your package manager:
  ```bash
  sudo apt-get install php php-cli php-mbstring php-xml php-json php-sqlite3
  ```

### 3. Install Composer
Download from [getcomposer.org](https://getcomposer.org/download/)

Or using a package manager:
```bash
# macOS (Homebrew)
brew install composer

# Linux (apt)
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
```

Verify installation:
```bash
php --version
composer --version
```

### 4. Install Node.js and npm
Download from [nodejs.org](https://nodejs.org/). Choose the LTS version for stability.

Verify installation:
```bash
node --version
npm --version
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

### Step 1: Clone the Repository

```bash
git clone https://github.com/Elton726/Mzuzu-Inmate-Management-System.git
cd Mzuzu-Inmate-Management-System
```

### Step 2: Navigate to Backend Directory

```bash
cd mims-backend
```

### Step 3: Install PHP Dependencies

```bash
composer install
```

This will install all required PHP packages from the `composer.json` file.

### Step 4: Create Environment Configuration

Copy the example environment file and customize it:

```bash
cp .env.example .env
```

Edit the `.env` file and configure:

```env
APP_NAME="MIMS"
APP_ENV=local
APP_KEY=                    # Will be generated in next step
APP_DEBUG=true
APP_URL=http://localhost:8000

# Database Configuration (choose one)
# For SQLite (default, no additional config needed):
DB_CONNECTION=sqlite
DB_DATABASE=database.sqlite

# OR for MySQL:
# DB_CONNECTION=mysql
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_DATABASE=mims_db
# DB_USERNAME=root
# DB_PASSWORD=your_password

# API Configuration
SANCTUM_STATEFUL_DOMAINS=localhost:5173,localhost:3000
```

**Note**: The `APP_KEY` will be generated in the next step.

### Step 5: Generate Application Key

```bash
php artisan key:generate
```

This creates a unique encryption key for your application.

### Step 6: Run Database Migrations

```bash
php artisan migrate
```

This creates the necessary database tables and schema.

### Step 7: (Optional) Seed Sample Data

```bash
php artisan db:seed
```

This populates the database with sample data for testing.

### Step 8: Verify Backend Setup

You can test the backend by running:

```bash
php artisan serve
```

The backend should be accessible at `http://localhost:8000`

Press `Ctrl+C` to stop the server.

---

## 🎨 Frontend Setup

### Step 1: Navigate to Frontend Directory

From the project root:

```bash
cd MIMS-FRONTEND
```

### Step 2: Install JavaScript Dependencies

```bash
npm install
```

This installs all required Node.js packages from the `package.json` file.

### Step 3: Create Environment Configuration (Optional)

Create a `.env.local` file if needed for environment-specific configuration:

```bash
# .env.local
VITE_API_BASE_URL=http://localhost:8000/api
```

### Step 4: Verify Frontend Setup

Test the frontend development server:

```bash
npm run dev
```

The frontend should be accessible at `http://localhost:5173` (or the URL shown in terminal)

Press `Ctrl+C` to stop the server.

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

## 🏗️ Building for Production

### Frontend Build

```bash
cd MIMS-FRONTEND
npm run build
```

This creates an optimized production build in the `dist/` directory.

### Backend Optimization

```bash
cd mims-backend
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

---

## 🐛 Troubleshooting

### Common Issues and Solutions

#### 1. **Composer Installation Fails**

**Problem**: `composer install` returns errors

**Solutions**:
- Ensure PHP 8.2+ is installed: `php --version`
- Update Composer: `composer self-update`
- Clear cache: `composer clear-cache`
- Try again with verbose output: `composer install -vv`

#### 2. **npm Installation Fails**

**Problem**: `npm install` returns errors

**Solutions**:
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and lock file:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```
- Ensure Node.js is up to date: `node --version`

#### 3. **Database Connection Error**

**Problem**: Laravel can't connect to the database

**Solutions**:
- Verify `.env` file has correct database configuration
- For SQLite: Ensure `storage/` directory exists and is writable
- For MySQL: Verify MySQL is running and credentials are correct
- Run migrations again: `php artisan migrate`

#### 4. **Port Already in Use**

**Problem**: "Address already in use" error

**Solutions**:
- Use a different port:
  ```bash
  php artisan serve --port=8001
  npm run dev -- --port 5174
  ```
- Or kill the process using the port:
  ```bash
  # Linux/macOS
  sudo lsof -ti:8000 | xargs kill -9
  
  # Windows
  netstat -ano | findstr :8000
  taskkill /PID <PID> /F
  ```

#### 5. **API Calls Return 401 (Unauthorized)**

**Problem**: Frontend can't authenticate with backend

**Solutions**:
- Ensure backend is running on `http://localhost:8000`
- Check SANCTUM configuration in `.env`
- Clear frontend cache: `Ctrl+Shift+Delete` in browser
- Check browser console for CORS errors

#### 6. **CORS Errors in Browser Console**

**Problem**: "Access to XMLHttpRequest blocked by CORS"

**Solutions**:
- Verify `SANCTUM_STATEFUL_DOMAINS` in `.env` is set to front end URL
- Check `config/cors.php` configuration
- Restart backend server after changing `.env`

#### 7. **Node.js Version Issues**

**Problem**: Vite or npm complaining about Node version

**Solutions**:
- Check your Node.js version: `node --version`
- Update Node.js from [nodejs.org](https://nodejs.org/)
- Or use a version manager (nvm on Linux/macOS, nvm-windows on Windows)

---

## 📚 Additional Resources

- [Laravel Documentation](https://laravel.com/docs)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Laravel Octane Documentation](https://laravel.com/docs/octane)

---

## 🤝 Getting Help

If you encounter issues:

1. Check this troubleshooting section first
2. Review the project's GitHub Issues
3. Check the individual README files in `mims-backend/` and `MIMS-FRONTEND/`
4. Consult the framework documentation

---

## 📝 Notes

- Always keep sensitive information (API keys, database passwords) out of version control
- Use `.env` files for local development configuration
- Never commit `.env` files to Git; only commit `.env.example`
- Regularly update dependencies: `composer update` and `npm update`

---

Happy coding! 🚀
