<?php

namespace App\Modules\ActivityAllocation\Listeners;

use App\Models\AuditLog;
use App\Modules\ActivityAllocation\Events\OfficerDutyAssigned;
use App\Modules\ActivityAllocation\Events\OfficerDutyModified;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class LogOfficerDutyAssignment
{
    public function handle(OfficerDutyAssigned|OfficerDutyModified $event): void
    {
        $action = $event instanceof OfficerDutyAssigned ? 'INSERT' : 'UPDATE';
        $oldData = $event instanceof OfficerDutyModified ? $event->oldData : null;

        $roster = $event->roster;

        AuditLog::query()->create([
            'user_id' => Auth::id(),
            'action' => $action,
            'table_name' => 'officer_duty_rosters',
            'record_id' => $roster->id,
            'old_data' => $oldData,
            'new_data' => $roster->toArray(),
            'ip_address' => Request::ip(),
        ]);
    }
}
