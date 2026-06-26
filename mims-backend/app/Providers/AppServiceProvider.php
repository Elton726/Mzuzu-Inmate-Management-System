<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\ServiceProvider;
use App\Services\RateLimitService;
use App\Listeners\RecordAuthenticationFailure;
use Illuminate\Contracts\Events\Dispatcher;
use Illuminate\Auth\Events\Failed;
use App\Modules\Release\Services\ReleaseClearanceService;
use App\Modules\Release\Repositories\ReleaseClearanceRepository;
use App\Modules\Release\Services\ReleaseService;
use App\Modules\Release\Repositories\ReleaseWorkflowRepository;

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

        // Register Release Module Services
        $this->app->bind(ReleaseClearanceRepository::class, function ($app) {
            return new ReleaseClearanceRepository();
        });

        $this->app->bind(ReleaseClearanceService::class, function ($app) {
            return new ReleaseClearanceService(
                $app->make(ReleaseClearanceRepository::class)
            );
        });

        $this->app->bind(ReleaseService::class, function ($app) {
            return new ReleaseService(
                $app->make(ReleaseWorkflowRepository::class),
                $app->make(ReleaseClearanceService::class)
            );
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
