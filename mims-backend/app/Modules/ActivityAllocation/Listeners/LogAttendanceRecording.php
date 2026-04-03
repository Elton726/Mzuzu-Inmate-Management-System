<?php

namespace App\Modules\ActivityAllocation\Listeners;

use App\Models\AuditLog;
use App\Modules\ActivityAllocation\Events\AttendanceRecorded;

class LogAttendanceRecording
{
    public function handle(AttendanceRecorded $event): void
    {
        $attendance = $event->attendance;

        AuditLog::query()->create([
            'user_id' => auth()->id(),
            'action' => 'INSERT',
            'table_name' => 'session_attendance',
            'record_id' => $attendance->id,
            'new_data' => $attendance->toArray(),
            'ip_address' => request()->ip(),
        ]);
    }
}
