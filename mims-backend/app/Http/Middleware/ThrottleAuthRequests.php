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
     * Handle an incoming request - specialized for login/password change with lockout.
     *
     * Important: do NOT rate-limit successful attempts. We lock/rate-limit based on
     * failed login responses (401/403) to avoid the "4th request works" issue.
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

        // 1) If locked already, block immediately.
        if (config('ratelimit.lockout.enabled')) {
            $lockoutStatus = $this->rateLimitService->checkLockout(
                $key,
                config('ratelimit.lockout.max_attempts'),
                config('ratelimit.lockout.lockout_minutes'),
                config('ratelimit.lockout.reset_minutes')
            );

            if ($lockoutStatus['locked']) {
                $response = response()->json([
                    'message' => 'Too many failed attempts. Your access has been temporarily locked.',
                    'retry_after' => $lockoutStatus['retry_after'] ?? null,
                ], 429);

                $response->headers->set('Retry-After', (string) ($lockoutStatus['retry_after'] ?? 900));

                return $response;
            }
        }

        // 2) Let the request go through. We will only apply rate-limit headers/response
        //    counters when we detect a failure response.
        $response = $next($request);

        // Determine if this was a login failure.
        // - Login controller returns 401 for bad credentials
        // - It returns 403 for inactive account
        // - Password changes return 422 for an incorrect current password
        $failureStatusCodes = $limitName === 'password_change' ? [401, 403, 422] : [401, 403];
        $isFailure = in_array((int) $response->getStatusCode(), $failureStatusCodes, true);

        // 3) Record failures & enforce throttling only after a failure.
        if ($isFailure) {
            // Record failure for lockout logic.
            if (config('ratelimit.lockout.enabled')) {
                $this->rateLimitService->recordFailure(
                    $key,
                    config('ratelimit.lockout.max_attempts'),
                    config('ratelimit.lockout.lockout_minutes'),
                    config('ratelimit.lockout.reset_minutes')
                );
            }

            // Enforce standard rate limit based on failed attempts only.
            $limit = $this->rateLimitService->checkLimit(
                $key,
                $config['requests'],
                $config['window']
            );

            if (!$limit['allowed']) {
                $response = response()->json([
                    'message' => $config['message'],
                    'retry_after' => $limit['retry_after'],
                ], 429);

                $response->headers->set('Retry-After', (string) $limit['retry_after']);

                return $response;
            }

            $response->headers->set('X-RateLimit-Limit', (string) $config['requests']);
            $response->headers->set('X-RateLimit-Remaining', (string) $limit['remaining']);
            $response->headers->set('X-RateLimit-Reset', (string) $limit['reset_at']);
            $response->headers->set('Retry-After', (string) $limit['retry_after']);

            return $response;
        }

        // For non-failure responses, do not apply throttling effects.
        return $response;
    }
}
