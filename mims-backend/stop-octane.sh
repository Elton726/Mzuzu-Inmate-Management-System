#!/bin/bash

# Laravel Octane Stop Script

set -e

echo "🛑 Stopping Laravel Octane..."

# Check if we're in the right directory
if [ ! -f "artisan" ]; then
    echo "❌ Error: artisan file not found. Please run this script from the Laravel project root."
    exit 1
fi

# Stop Octane
php artisan octane:stop

echo "✅ Octane stopped successfully."
