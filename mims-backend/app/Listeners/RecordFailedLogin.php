<?php

namespace App\Listeners;

use App\Events\LoginFailed;
use App\Services\RateLimitService;
use Illuminate\Events\Dispatcher;

class RecordFailedLogin
{
    public function __construct(protected RateLimitService $rateLimitService) {}

    public function handle(LoginFailed $event): void
    {
        $key = "auth_ip:{$event->ip}";

        $this->rateLimitService->recordFailure(
            $key,
            config('ratelimit.lockout.max_attempts'),
            config('ratelimit.lockout.lockout_minutes'),
            config('ratelimit.lockout.reset_minutes')
        );
    }

    /**
     * Register the listeners for the subscriber.
     *
     * @param  Dispatcher  $events
     * @return array
     */
    public function subscribe(Dispatcher $events)
    {
        return [
            LoginFailed::class => 'handle',
        ];
    }
}
