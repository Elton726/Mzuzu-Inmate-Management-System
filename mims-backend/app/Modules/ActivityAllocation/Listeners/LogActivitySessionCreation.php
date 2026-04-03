<?php

namespace App\Modules\ActivityAllocation\Listeners;

use App\Models\AuditLog;

class LogActivitySessionCreation
{
    public function handle($event)
    {
        AuditLog::create([
            'user_id' => auth()->id(),
            'action' => 'INSERT',
            'table_name' => 'activity_sessions',
            'record_id' => $event->session->id,
            'new_data' => $event->session->toArray(),
            'ip_address' => request()->ip(),
        ]);
    }
}
