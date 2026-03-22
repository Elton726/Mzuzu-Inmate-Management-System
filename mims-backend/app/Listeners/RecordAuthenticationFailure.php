<?php

namespace App\Listeners;

use App\Services\RateLimitService;
use Illuminate\Auth\Events\Failed;

class RecordAuthenticationFailure
{
    public function __construct(protected RateLimitService $rateLimitService) {}

    /**
     * Handle the event.
     */
    public function handle(Failed $event): void
    {
        if (request()->has('email')) {
            $key = "auth_ip:" . request()->ip();

            $this->rateLimitService->recordFailure(
                $key,
                config('ratelimit.lockout.max_attempts'),
                config('ratelimit.lockout.lockout_minutes'),
                config('ratelimit.lockout.reset_minutes')
            );
        }
    }
}
