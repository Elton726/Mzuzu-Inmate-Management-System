<?php

namespace App\Providers;

use App\Modules\ActivityAllocation\Events\ActivityCreated;
use App\Modules\ActivityAllocation\Events\ActivityUpdated;
use App\Modules\ActivityAllocation\Events\OfficerDutyAssigned;
use App\Modules\ActivityAllocation\Events\OfficerDutyModified;
use App\Modules\ActivityAllocation\Listeners\LogActivityChange;
use App\Modules\ActivityAllocation\Listeners\LogOfficerDutyAssignment;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;

class EventServiceProvider extends ServiceProvider
{
    protected $listen = [
        OfficerDutyAssigned::class => [
            LogOfficerDutyAssignment::class,
        ],
        OfficerDutyModified::class => [
            LogOfficerDutyAssignment::class,
        ],
        ActivityCreated::class => [
            LogActivityChange::class,
        ],
        ActivityUpdated::class => [
            LogActivityChange::class,
        ],
    ];
}

