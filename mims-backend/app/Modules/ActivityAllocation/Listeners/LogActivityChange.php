<?php

namespace App\Modules\ActivityAllocation\Listeners;

use App\Models\AuditLog;
use App\Modules\ActivityAllocation\Events\ActivityCreated;
use App\Modules\ActivityAllocation\Events\ActivityUpdated;

class LogActivityChange
{
    public function handle(object $event): void
    {
        $action = $event instanceof ActivityCreated ? 'INSERT' : 'UPDATE';
        $oldData = $event instanceof ActivityUpdated ? $event->oldData : null;

        $activity = $event->activity;

        AuditLog::query()->create([
            'user_id' => auth()->id(),
            'action' => $action,
            'table_name' => 'activities',
            'record_id' => $activity->id,
            'old_data' => $oldData,
            'new_data' => $activity->toArray(),
            'ip_address' => request()->ip(),
        ]);
    }
}

