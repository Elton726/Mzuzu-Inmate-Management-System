<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\ServiceProvider;
use App\Services\RateLimitService;
use App\Listeners\RecordAuthenticationFailure;
use Illuminate\Contracts\Events\Dispatcher;
use Illuminate\Auth\Events\Failed;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(RateLimitService::class, function () {
            return new RateLimitService();
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(Dispatcher $events): void
    {
        ResetPassword::createUrlUsing(function (object $notifiable, string $token) {
            return config('app.frontend_url')."/password-reset/$token?email={$notifiable->getEmailForPasswordReset()}";
        });

        // Register event listeners for failed authentication
        $events->listen(Failed::class, RecordAuthenticationFailure::class);
    }
}
