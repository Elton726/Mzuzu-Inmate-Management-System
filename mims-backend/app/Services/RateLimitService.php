<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class RateLimitService
{
    /**
     * Check if a request is within rate limit
     *
     * @param string $key Unique identifier (IP, user ID, etc.)
     * @param int $requests Maximum requests allowed
     * @param int $window Time window in seconds
     * @return array ['allowed' => bool, 'remaining' => int, 'reset_at' => int]
     */
    public function checkLimit(string $key, int $requests = 60, int $window = 60): array
    {
        $cacheKey = "rate_limit:{$key}";
        $data = Cache::get($cacheKey, [
            'attempts' => 0,
            'first_attempt_at' => now()->timestamp,
            'blocked_until' => null,
        ]);

        // Check if user is currently blocked
        if ($data['blocked_until'] && now()->timestamp < $data['blocked_until']) {
            return [
                'allowed' => false,
                'remaining' => 0,
                'reset_at' => $data['blocked_until'],
                'retry_after' => $data['blocked_until'] - now()->timestamp,
            ];
        }

        $now = now()->timestamp;
        $elapsed = $now - $data['first_attempt_at'];

        // Reset if window has passed
        if ($elapsed >= $window) {
            $data = [
                'attempts' => 1,
                'first_attempt_at' => $now,
                'blocked_until' => null,
            ];
        } else {
            $data['attempts']++;
        }

        $remaining = max(0, $requests - $data['attempts']);
        $allowed = $data['attempts'] <= $requests;

        // Cache the updated data
        Cache::put($cacheKey, $data, $window);

        if (!$allowed) {
            Log::warning("Rate limit exceeded for key: {$key}", [
                'attempts' => $data['attempts'],
                'limit' => $requests,
            ]);
        }

        return [
            'allowed' => $allowed,
            'remaining' => $remaining,
            'reset_at' => $data['first_attempt_at'] + $window,
            'retry_after' => ($data['first_attempt_at'] + $window) - $now,
        ];
    }

    /**
     * Check and apply lockout after multiple failures
     *
     * @param string $key Unique identifier
     * @param int $maxAttempts Maximum attempts before lockout
     * @param int $lockoutMinutes Duration of lockout
     * @param int $resetMinutes Reset counter after this time
     * @return array ['locked' => bool, 'locked_until' => ?int]
     */
    public function checkLockout(
        string $key,
        int $maxAttempts = 10,
        int $lockoutMinutes = 15,
        int $resetMinutes = 60
    ): array {
        $failureKey = "lockout_failures:{$key}";
        $lockedKey = "lockout_locked:{$key}";

        // Check if already locked
        if (Cache::has($lockedKey)) {
            $lockedUntil = Cache::get($lockedKey);
            return [
                'locked' => true,
                'locked_until' => $lockedUntil,
                'retry_after' => $lockedUntil - now()->timestamp,
            ];
        }

        $failures = Cache::get($failureKey, 0);

        return [
            'locked' => false,
            'failures' => $failures,
            'max_attempts' => $maxAttempts,
        ];
    }

    /**
     * Record a failed attempt and apply lockout if needed
     *
     * @param string $key Unique identifier
     * @param int $maxAttempts Maximum attempts before lockout
     * @param int $lockoutMinutes Duration of lockout
     * @param int $resetMinutes Reset counter after this time
     * @return array ['locked' => bool, 'locked_until' => ?int, 'failures' => int]
     */
    public function recordFailure(
        string $key,
        int $maxAttempts = 10,
        int $lockoutMinutes = 15,
        int $resetMinutes = 60
    ): array {
        $failureKey = "lockout_failures:{$key}";
        $lockedKey = "lockout_locked:{$key}";

        // Get current failure count
        $failures = Cache::get($failureKey, 0) + 1;

        // Store the updated count with expiration
        Cache::put($failureKey, $failures, $resetMinutes * 60);

        if ($failures >= $maxAttempts) {
            $lockedUntil = now()->addMinutes($lockoutMinutes)->timestamp;
            Cache::put($lockedKey, $lockedUntil, $lockoutMinutes * 60);

            Log::warning("User locked out due to too many failed attempts", [
                'key' => $key,
                'failures' => $failures,
                'locked_until' => $lockedUntil,
            ]);

            return [
                'locked' => true,
                'locked_until' => $lockedUntil,
                'failures' => $failures,
                'retry_after' => $lockoutMinutes * 60,
            ];
        }

        return [
            'locked' => false,
            'failures' => $failures,
            'max_attempts' => $maxAttempts,
        ];
    }

    /**
     * Clear all rate limit data for a key
     *
     * @param string $key Unique identifier
     * @return void
     */
    public function clearLimit(string $key): void
    {
        Cache::forget("rate_limit:{$key}");
        Cache::forget("lockout_failures:{$key}");
        Cache::forget("lockout_locked:{$key}");
    }

    /**
     * Get rate limit key for an identifier (IP or User ID)
     *
     * @param mixed $identifier
     * @param string $type 'ip' or 'user'
     * @return string
     */
    public function getKey($identifier, string $type = 'ip'): string
    {
        return "{$type}:{$identifier}";
    }

    /**
     * Check if an IP or path should bypass rate limiting
     *
     * @param string $ip IP address
     * @param string $path Request path
     * @return bool
     */
    public function shouldBypass(string $ip, string $path): bool
    {
        $bypassIps = config('ratelimit.bypass.ips');
        if ($bypassIps) {
            $ips = array_map('trim', explode(',', $bypassIps));
            if (in_array($ip, $ips)) {
                return true;
            }
        }

        $bypassPaths = config('ratelimit.bypass.paths', []);
        foreach ($bypassPaths as $bypassPath) {
            if (str_starts_with($path, $bypassPath)) {
                return true;
            }
        }

        return false;
    }
}
