<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Rate Limiting Configuration
    |--------------------------------------------------------------------------
    |
    | Configure rate limiting rules for different API endpoints and user roles
    |
    */

    'enabled' => env('RATE_LIMIT_ENABLED', true),

    'cache_store' => env('RATE_LIMIT_CACHE_STORE', 'cache'),

    /*
    |--------------------------------------------------------------------------
    | Default Rate Limits (requests per minute)
    |--------------------------------------------------------------------------
    */

    'limits' => [
        // Authentication endpoints - more restrictive
        'auth_login' => [
            'requests' => 5,
            'window' => 60, // seconds
            'message' => 'Too many login attempts. Please try again in a few moments.',
        ],

        'auth_register' => [
            'requests' => 3,
            'window' => 60,
            'message' => 'Too many registration attempts. Please try again later.',
        ],

        // General API endpoints
        'api_default' => [
            'requests' => 60,
            'window' => 60,
            'message' => 'Too many requests. You have exceeded the rate limit.',
        ],

        // User profile endpoints
        'user_profile' => [
            'requests' => 30,
            'window' => 60,
            'message' => 'Too many profile requests. Please wait before trying again.',
        ],

        // Admin endpoints - less restrictive for admins
        'admin_users' => [
            'requests' => 100,
            'window' => 60,
            'message' => 'Rate limit exceeded for admin operations.',
        ],

        // Password change - very restrictive
        'password_change' => [
            'requests' => 3,
            'window' => 300, // 5 minutes
            'message' => 'Too many password change attempts. Please try again in 5 minutes.',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Per-User Rate Limits
    |--------------------------------------------------------------------------
    */

    'per_user' => [
        'authenticated' => 120,  // per minute for logged-in users
        'guest' => 30,           // per minute for guests
    ],

    /*
    |--------------------------------------------------------------------------
    | Throttle Bypass
    |--------------------------------------------------------------------------
    |
    | Define paths or IPs that should bypass rate limiting
    |
    */

    'bypass' => [
        'ips' => env('RATE_LIMIT_BYPASS_IPS', ''),  // comma-separated IPs
        'paths' => [
            // Add paths that should bypass rate limiting
            'api/health',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Lockout Configuration
    |--------------------------------------------------------------------------
    |
    | After X failed attempts, lock the user out for Y minutes
    |
    */

    'lockout' => [
        'enabled' => true,
        'max_attempts' => 10,        // failed attempts before lockout
        'lockout_minutes' => 15,     // how long to lock out
        'reset_minutes' => 60,       // reset counter after this time
    ],
];
