# Rate Limiting Configuration

## Overview
This backend now includes comprehensive rate limiting and throttling to protect against:
- Brute force login attempts
- API abuse
- DDoS attacks
- Unauthorized access attempts

## Features

### 1. **IP-Based Rate Limiting**
- Tracks requests per IP address
- Prevents excessive requests from single sources
- Configurable per endpoint

### 2. **User-Based Rate Limiting**
- Authenticated users have per-user limits
- Admin users get higher limits
- Prevents single account from overwhelming the system

### 3. **Lockout Mechanism**
- After X failed login attempts, IP is locked
- Prevents brute force attacks
- Configurable lockout duration

### 4. **Endpoint-Specific Throttling**
- Login: 5 requests per minute
- Registration: 3 requests per minute  
- Password change: 3 requests per 5 minutes
- User profile: 30 requests per minute
- Admin operations: 100 requests per minute

## Configuration

### Environment Variables

```env
# Enable or disable rate limiting (default: true)
RATE_LIMIT_ENABLED=true

# Cache store for rate limit data (default: cache)
# Options: cache (recommended), redis, memcached, database
RATE_LIMIT_CACHE_STORE=cache

# IPs to bypass rate limiting (comma-separated)
RATE_LIMIT_BYPASS_IPS=127.0.0.1,::1

# Cache settings for rate limiting
CACHE_STORE=database
```

### Configuration File

Edit `config/ratelimit.php` to customize limits:

```php
'limits' => [
    'auth_login' => [
        'requests' => 5,      // 5 requests
        'window' => 60,       // per 60 seconds
        'message' => '...',   // error message
    ],
    // ... other endpoints
],

'lockout' => [
    'enabled' => true,
    'max_attempts' => 10,        // failed attempts before lockout
    'lockout_minutes' => 15,     // duration of lockout
    'reset_minutes' => 60,       // reset counter after this time
],
```

## Rate Limit Headers

All API responses include rate limit information:

```
X-RateLimit-Limit: 30          # Maximum requests allowed
X-RateLimit-Remaining: 25      # Remaining requests in window
X-RateLimit-Reset: 1234567890  # Unix timestamp when limit resets
Retry-After: 45                # Seconds until retry is allowed
```

## Responses

### Rate Limit Exceeded (429)

```json
{
    "message": "Rate limit exceeded",
    "retry_after": 45
}
```

### Locked Out (429)

```json
{
    "message": "Too many failed attempts. Your access has been temporarily locked.",
    "retry_after": 900
}
```

## Implementing Custom Limits

### Global Route Throttling

```php
// 60 requests per 60 seconds, per IP
Route::post('/endpoint', Controller::class)->middleware('throttle:60,60,ip');

// 30 requests per 60 seconds, per authenticated user
Route::post('/endpoint', Controller::class)->middleware('throttle:30,60,user');

// Combined: per-user limit if authenticated, otherwise per-IP
Route::post('/endpoint', Controller::class)->middleware('throttle:50,60,combined');
```

### Auth-Specific Throttling

```php
// Uses lockout mechanism, references config limits
Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle.auth:auth_login');
```

## Monitoring & Debugging

### Check Rate Limit Status

Use the `RateLimitService` in your code:

```php
use App\Services\RateLimitService;

$service = app(RateLimitService::class);

// Check limit
$limit = $service->checkLimit('ip:192.168.1.1', 60, 60);
if (!$limit['allowed']) {
    // Handle rate limit
}

// Clear limit for a key
$service->clearLimit('ip:192.168.1.1');

// Check lockout
$lockout = $service->checkLockout('auth_ip:192.168.1.1');
```

### Log Files

Rate limit violations are logged to `storage/logs/laravel.log`:

```
[warning] Rate limit exceeded for key: ip:192.168.1.1
[warning] User locked out due to too many failed attempts
```

## Database Setup

If using database cache, ensure the cache table exists:

```bash
php artisan cache:table
php artisan migrate
```

## Best Practices

1. **Monitor Rate Limit Hits**: Regularly check logs for patterns indicating attacks
2. **Adjust Limits**: Base limits on your actual usage patterns
3. **Whitelist IPs**: Add trusted IPs to `RATE_LIMIT_BYPASS_IPS` if needed
4. **Cache Backend**: Use Redis or Memcached for better performance than database
5. **Frontend Handling**: Display user-friendly messages when rate limit is exceeded

## Troubleshooting

### Rate Limiting Not Working
- Check `RATE_LIMIT_ENABLED=true` in .env
- Verify cache is working: `php artisan cache:clear`
- Check middleware is registered in `bootstrap/app.php`

### False Positives
- Increase limit window seconds
- Add IPs to bypass list
- Check if cache backend is functioning

### Authentication Failures Not Tracked
- Verify `EventServiceProvider` has listeners registered
- Check that events are being dispatched
- Review `storage/logs/laravel.log`

## Support

For issues or questions about rate limiting:
1. Check the configuration in `config/ratelimit.php`
2. Review logs in `storage/logs/laravel.log`
3. Test rate limits manually using curl:
   ```bash
   curl -i -X POST http://localhost:8000/api/login
   ```
