#!/bin/bash

# Laravel Octane Reload Script

set -e

echo "🔄 Reloading Laravel Octane workers..."

# Check if we're in the right directory
if [ ! -f "artisan" ]; then
    echo "❌ Error: artisan file not found. Please run this script from the Laravel project root."
    exit 1
fi

# Reload Octane workers
php artisan octane:reload

echo "✅ Octane workers reloaded successfully."
