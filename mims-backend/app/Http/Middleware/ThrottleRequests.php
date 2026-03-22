<?php

namespace App\Http\Middleware;

use App\Services\RateLimitService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
class ThrottleRequests
{
    protected RateLimitService $rateLimitService;

    public function __construct(RateLimitService $rateLimitService)
    {
        $this->rateLimitService = $rateLimitService;
    }

    /**
     * Handle an incoming request.
     *
     * @param Request $request
     * @param Closure $next
     * @param string|int $maxRequests Maximum requests allowed
     * @param string|int $windowSeconds Time window in seconds
     * @param string|null $limitType 'ip', 'user', or 'combined'
     * @return SymfonyResponse
     */
    public function handle(
        Request $request,
        Closure $next,
        string|int $maxRequests = 60,
        string|int $windowSeconds = 60,
        string|null $limitType = 'ip'
    ) {
        if (!config('ratelimit.enabled')) {
            return $next($request);
        }

        // Check if path should bypass rate limiting
        if ($this->rateLimitService->shouldBypass($request->ip(), $request->path())) {
            return $next($request);
        }

        // Determine the limit key based on type
        $key = $this->getLimitKey($request, $limitType);

        // Check rate limit
        $limit = $this->rateLimitService->checkLimit($key, (int)$maxRequests, (int)$windowSeconds);

        if (!$limit['allowed']) {
            return $this->buildResponse($limit, 429);
        }

        $response = $next($request);

        // Add rate limit headers
        return $response
            ->header('X-RateLimit-Limit', $maxRequests)
            ->header('X-RateLimit-Remaining', $limit['remaining'])
            ->header('X-RateLimit-Reset', $limit['reset_at'])
            ->header('Retry-After', $limit['retry_after']);
    }

    /**
     * Get the rate limit key based on type
     *
     * @param Request $request
     * @param string|null $limitType
     * @return string
     */
    protected function getLimitKey(Request $request, ?string $limitType): string
    {
        return match ($limitType) {
            'user' => $this->rateLimitService->getKey($request->user()?->id ?? 'guest', 'user'),
            'combined' => $this->rateLimitService->getKey(
                ($request->user()?->id ?? $request->ip()),
                $request->user() ? 'user' : 'ip'
            ),
            default => $this->rateLimitService->getKey($request->ip(), 'ip'),
        };
    }

    /**
     * Build rate limit exceeded response
     *
     * @param array $limit
     * @param int $status
     * @return JsonResponse
     */
    protected function buildResponse(array $limit, int $status): JsonResponse
    {
        return response()->json([
            'message' => 'Rate limit exceeded',
            'retry_after' => $limit['retry_after'] ?? null,
        ], $status)
        ->header('Retry-After', $limit['retry_after'] ?? 60)
        ->header('X-RateLimit-Reset', $limit['reset_at'] ?? null);
    }
}
