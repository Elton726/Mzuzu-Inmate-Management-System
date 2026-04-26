<?php

namespace App\Providers;

use App\Modules\ActivityAllocation\Events\ActivityCreated;
use App\Modules\ActivityAllocation\Events\ActivitySessionCreated;
use App\Modules\ActivityAllocation\Events\ActivityUpdated;
use App\Modules\ActivityAllocation\Events\AttendanceRecorded;
use App\Modules\ActivityAllocation\Events\OfficerDutyAssigned;
use App\Modules\ActivityAllocation\Events\OfficerDutyModified;
use App\Modules\ActivityAllocation\Listeners\LogActivityChange;
use App\Modules\ActivityAllocation\Listeners\LogActivitySessionCreation;
use App\Modules\ActivityAllocation\Listeners\LogAttendanceRecording;
use App\Modules\ActivityAllocation\Listeners\LogOfficerDutyAssignment;
use App\Modules\Release\Events\ReleaseApproved;
use App\Modules\Release\Events\ReleaseCancelled;
use App\Modules\Release\Events\ReleaseConfirmed;
use App\Modules\Release\Events\SentenceAdjusted;
use App\Modules\Release\Listeners\LogReleaseAction;
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
        ActivitySessionCreated::class => [
            LogActivitySessionCreation::class,
        ],
        AttendanceRecorded::class => [
            LogAttendanceRecording::class,
        ],
        ReleaseApproved::class => [
            LogReleaseAction::class,
        ],
        ReleaseConfirmed::class => [
            LogReleaseAction::class,
        ],
        ReleaseCancelled::class => [
            LogReleaseAction::class,
        ],
        SentenceAdjusted::class => [
            LogReleaseAction::class,
        ],
    ];
}
