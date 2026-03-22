<?php

namespace App\Http\Middleware;

use App\Services\RateLimitService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class ThrottleAuthRequests
{
    protected RateLimitService $rateLimitService;

    public function __construct(RateLimitService $rateLimitService)
    {
        $this->rateLimitService = $rateLimitService;
    }

    /**
     * Handle an incoming request - specialized for login/password change with lockout
     *
     * @param Request $request
     * @param Closure $next
     * @param string $limitName Configuration key from ratelimit.php
     * @return SymfonyResponse
     */
    public function handle(Request $request, Closure $next, string $limitName = 'auth_login'): SymfonyResponse
    {
        if (!config('ratelimit.enabled')) {
            return $next($request);
        }

        $config = config("ratelimit.limits.{$limitName}");

        if (!$config) {
            return $next($request);
        }

        $key = "auth_ip:{$request->ip()}";

        // Check lockout first
        if (config('ratelimit.lockout.enabled')) {
            $lockoutStatus = $this->rateLimitService->checkLockout(
                $key,
                config('ratelimit.lockout.max_attempts'),
                config('ratelimit.lockout.lockout_minutes'),
                config('ratelimit.lockout.reset_minutes')
            );

            if ($lockoutStatus['locked']) {
                return response()->json([
                    'message' => 'Too many failed attempts. Your access has been temporarily locked.',
                    'retry_after' => $lockoutStatus['retry_after'] ?? null,
                ], 429)
                    ->header('Retry-After', $lockoutStatus['retry_after'] ?? 900);
            }
        }

        // Check standard rate limit
        $limit = $this->rateLimitService->checkLimit(
            $key,
            $config['requests'],
            $config['window']
        );

        if (!$limit['allowed']) {
            return response()->json([
                'message' => $config['message'],
                'retry_after' => $limit['retry_after'],
            ], 429)
                ->header('Retry-After', $limit['retry_after']);
        }

        $response = $next($request);

        // Add rate limit headers
        return $response
            ->header('X-RateLimit-Limit', $config['requests'])
            ->header('X-RateLimit-Remaining', $limit['remaining'])
            ->header('X-RateLimit-Reset', $limit['reset_at'])
            ->header('Retry-After', $limit['retry_after']);
    }
}
