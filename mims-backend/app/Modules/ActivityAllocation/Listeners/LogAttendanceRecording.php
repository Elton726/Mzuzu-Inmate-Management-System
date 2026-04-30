<?php

namespace App\Modules\ActivityAllocation\Listeners;

use App\Models\AuditLog;
use App\Modules\ActivityAllocation\Events\AttendanceRecorded;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class LogAttendanceRecording
{
    public function handle(AttendanceRecorded $event): void
    {
        $attendance = $event->attendance;

        AuditLog::query()->create([
            'user_id' => Auth::id(),
            'action' => 'INSERT',
            'table_name' => 'session_attendance',
            'record_id' => $attendance->id,
            'new_data' => $attendance->toArray(),
            'ip_address' => Request::ip(),
        ]);
    }
}
