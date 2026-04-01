<?php

namespace App\Modules\ActivityAllocation\Listeners;

use App\Models\AuditLog;
use App\Modules\ActivityAllocation\Events\OfficerDutyAssigned;
use App\Modules\ActivityAllocation\Events\OfficerDutyModified;

class LogOfficerDutyAssignment
{
    public function handle(object $event): void
    {
        $action = $event instanceof OfficerDutyAssigned ? 'INSERT' : 'UPDATE';
        $oldData = $event instanceof OfficerDutyModified ? $event->oldData : null;

        $roster = $event->roster;

        AuditLog::query()->create([
            'user_id' => auth()->id(),
            'action' => $action,
            'table_name' => 'officer_duty_rosters',
            'record_id' => $roster->id,
            'old_data' => $oldData,
            'new_data' => $roster->toArray(),
            'ip_address' => request()->ip(),
        ]);
    }
}

