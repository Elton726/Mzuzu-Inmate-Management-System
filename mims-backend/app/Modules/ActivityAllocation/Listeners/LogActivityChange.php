<?php

namespace App\Modules\ActivityAllocation\Listeners;

use App\Models\AuditLog;
use App\Modules\ActivityAllocation\Events\ActivityCreated;
use App\Modules\ActivityAllocation\Events\ActivityUpdated;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class LogActivityChange
{
    public function handle(object $event): void
    {
        $action = $event instanceof ActivityCreated ? 'INSERT' : 'UPDATE';
        $oldData = $event instanceof ActivityUpdated ? $event->oldData : null;

        $activity = $event->activity;

        AuditLog::query()->create([
            'user_id' => Auth::id(),
            'action' => $action,
            'table_name' => 'activities',
            'record_id' => $activity->id,
            'old_data' => $oldData,
            'new_data' => $activity->toArray(),
            'ip_address' => Request::ip(),
        ]);
    }
}
