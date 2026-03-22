# Laravel Octane Implementation Guide

## Overview

Laravel Octane supercharges your Laravel application by serving it using high-performance application servers like FrankenPHP, Swoole, or RoadRunner. This can dramatically improve performance, especially for applications with high traffic.

## 🚀 Performance Benefits

- **Request Handling**: Up to 10x faster request processing
- **Memory Usage**: More efficient memory management
- **Concurrent Requests**: Handle thousands of concurrent connections
- **Response Time**: Significantly reduced response times

## 📋 Prerequisites

### System Requirements
- PHP 8.2 or higher
- Linux/Unix environment (recommended)
- One of the following servers:
  - FrankenPHP (recommended for simplicity)
  - RoadRunner (high performance, Go-based)
  - Swoole (high performance, PHP extension)

### PHP Extensions Required
```bash
# Required for all servers
sudo apt install php8.2-cli php8.2-pcntl php8.2-posix

# For Swoole (if using Swoole server)
sudo apt install php8.2-swoole

# For database connections
sudo apt install php8.2-pgsql php8.2-sqlite3 php8.2-redis
```

## 🛠️ Installation

### 1. Install Laravel Octane
```bash
composer require laravel/octane
```

### 2. Install Server (Choose One)

#### Option A: FrankenPHP (Recommended)
```bash
# Install FrankenPHP binary
curl -sSL https://get.frankenphp.dev | sh

# Or download manually from: https://github.com/dunglas/frankenphp/releases
```

#### Option B: RoadRunner
```bash
# Install RoadRunner binary
curl -sSL https://roadrunner.dev/install.sh | sh

# Or download from: https://github.com/roadrunner-server/roadrunner/releases
```

#### Option C: Swoole
```bash
# Install Swoole extension
sudo apt install php8.2-swoole
# OR
pecl install swoole
```

### 3. Publish Configuration
```bash
php artisan vendor:publish --tag=octane-config
```

## ⚙️ Configuration

### Environment Variables (.env)

Add these to your `.env` file:

```env
# Octane Server Configuration
OCTANE_SERVER=frankenphp          # frankenphp, roadrunner, or swoole
OCTANE_HTTPS=false                # Set to true for HTTPS
OCTANE_WORKERS=4                  # Number of worker processes
OCTANE_MAX_REQUESTS=1000          # Max requests per worker before restart
OCTANE_WATCH=true                 # Enable file watching in development
```

### Octane Configuration (config/octane.php)

Key settings to customize:

```php
return [
    'server' => env('OCTANE_SERVER', 'frankenphp'),

    'https' => env('OCTANE_HTTPS', false),

    // Worker management
    'workers' => env('OCTANE_WORKERS', 4),
    'max_requests' => env('OCTANE_MAX_REQUESTS', 1000),

    // File watching (development)
    'watch' => [
        'app',
        'bootstrap',
        'config/**/*.php',
        'database/**/*.php',
        'routes',
        'composer.lock',
        '.env',
    ],

    // Services to warm up (improve performance)
    'warm' => [
        ...Octane::defaultServicesToWarm(),
        // Add your frequently used services here
        // \App\Services\RateLimitService::class,
    ],
];
```

## 🚀 Usage

### Starting Octane

#### Using the provided script (recommended):
```bash
# Start with configured server
./start-octane.sh

# Or specify server
OCTANE_SERVER=roadrunner ./start-octane.sh
```

#### Using Artisan commands:
```bash
# Start server
php artisan octane:start

# Start with specific options
php artisan octane:start --server=frankenphp --host=0.0.0.0 --port=8000 --workers=4

# Start with file watching (development)
php artisan octane:start --watch
```

### Managing Octane

```bash
# Stop server
./stop-octane.sh
# OR
php artisan octane:stop

# Reload workers (zero-downtime)
./reload-octane.sh
# OR
php artisan octane:reload

# Check status
php artisan octane:status

# View logs
php artisan octane:logs
```

## 🔧 Server-Specific Configuration

### FrankenPHP
- **Pros**: Easy installation, built-in Caddy web server
- **Best for**: Simple deployments, development
- **Port**: Default 8000 (or 443 for HTTPS)

### RoadRunner
- **Pros**: High performance, written in Go
- **Best for**: Production, high-traffic applications
- **Configuration**: Uses `.rr.yaml` file (auto-generated)

### Swoole
- **Pros**: Mature, feature-rich, PHP extension
- **Best for**: Advanced use cases, custom protocols
- **Memory**: More memory-efficient than others

## 📊 Monitoring & Performance

### Health Checks
```bash
# Built-in health check
curl http://localhost:8000/up
```

### Performance Monitoring
```bash
# Check active workers
php artisan octane:status

# Monitor with tools like:
# - New Relic
# - Blackfire
# - Tideways
```

### Key Metrics to Monitor
- Response time
- Memory usage per worker
- CPU usage
- Number of active workers
- Request throughput

## 🐛 Troubleshooting

### Common Issues

#### 1. Server Won't Start
```bash
# Check PHP extensions
php -m | grep -E "(swoole|pcntl|posix)"

# Check server binary
which frankenphp
which rr

# Check permissions
ls -la storage/ bootstrap/cache/
```

#### 2. High Memory Usage
```php
// In config/octane.php, add to listeners:
OperationTerminated::class => [
    CollectGarbage::class,
    // ... other listeners
],
```

#### 3. File Changes Not Detected
```bash
# Ensure watch paths are correct in config/octane.php
# Check file permissions
# Try manual reload
php artisan octane:reload
```

#### 4. Database Connections Issues
```php
// In config/octane.php, ensure database disconnection:
OperationTerminated::class => [
    DisconnectFromDatabases::class,
    // ... other listeners
],
```

### Debug Mode
```bash
# Start with debug information
php artisan octane:start --debug

# Check logs
tail -f storage/logs/laravel.log
```

## 🚀 Production Deployment

### Systemd Service (Linux)
Create `/etc/systemd/system/octane.service`:

```ini
[Unit]
Description=Laravel Octane Server
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/path/to/your/laravel/app
ExecStart=/path/to/your/laravel/app/start-octane.sh
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl enable octane
sudo systemctl start octane
sudo systemctl status octane
```

### Docker Deployment
```dockerfile
FROM php:8.2-cli

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    && docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd

# Install FrankenPHP
RUN curl -sSL https://get.frankenphp.dev | sh
ENV PATH="$PATH:/root/.local/bin"

# Set working directory
WORKDIR /var/www

# Copy application
COPY . .

# Install PHP dependencies
RUN composer install --optimize-autoloader --no-dev

# Generate app key
RUN php artisan key:generate

# Set permissions
RUN chown -R www-data:www-data storage bootstrap/cache

# Expose port
EXPOSE 8000

# Start Octane
CMD ["php", "artisan", "octane:start", "--server=frankenphp", "--host=0.0.0.0"]
```

### Nginx Reverse Proxy (Production)
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🔒 Security Considerations

### Worker Isolation
- Each worker process is isolated
- Session data is properly handled
- File uploads are cleaned up automatically

### HTTPS Configuration
```env
OCTANE_HTTPS=true
```
```nginx
# When using reverse proxy
proxy_set_header X-Forwarded-Proto https;
```

### Rate Limiting
Octane works perfectly with the existing rate limiting implementation. The rate limits are enforced per worker but shared across workers through the cache store.

## 📚 Additional Resources

- [Laravel Octane Documentation](https://laravel.com/docs/octane)
- [FrankenPHP Documentation](https://frankenphp.dev/)
- [RoadRunner Documentation](https://roadrunner.dev/)
- [Swoole Documentation](https://www.swoole.co.uk/)

## 🎯 Performance Tuning

### Worker Count
```bash
# General rule: CPU cores * 2
# For I/O bound apps: CPU cores * 4
nproc  # Check CPU cores
```

### Memory Limits
```php
// In php.ini or .user.ini
memory_limit = 256M  // Per worker
```

### Max Requests
```env
OCTANE_MAX_REQUESTS=1000  # Restart worker after N requests
```

### Cache Optimization
```php
// Use Octane cache for frequently accessed data
Cache::store('octane')->put('key', 'value', 3600);
```

## 🔄 Migration from Traditional Server

### Before Migration
1. Test thoroughly in staging environment
2. Monitor baseline performance metrics
3. Ensure all dependencies are compatible

### Migration Steps
1. Install Octane and server
2. Configure environment
3. Test with `./start-octane.sh`
4. Update deployment scripts
5. Monitor performance improvements

### Rollback Plan
```bash
# Stop Octane
./stop-octane.sh

# Start traditional server
php artisan serve --host=0.0.0.0 --port=8000
```

---

## 🚀 Quick Start Commands

```bash
# Install and start (FrankenPHP)
composer require laravel/octane
curl -sSL https://get.frankenphp.dev | sh
php artisan octane:install
./start-octane.sh

# Check status
php artisan octane:status

# Stop
./stop-octane.sh
```

Your Laravel application is now running on Octane! 🎉
