<?php

namespace App\Modules\ActivityAllocation\Listeners;

use App\Models\AuditLog;
use App\Modules\ActivityAllocation\Events\ActivitySessionCreated;
use App\Modules\ActivityAllocation\Events\ActivitySessionUpdated;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class LogActivitySessionCreation
{
    public function handle(ActivitySessionCreated|ActivitySessionUpdated $event): void
    {
        AuditLog::query()->create([
            'user_id' => Auth::id(),
            'action' => $event instanceof ActivitySessionCreated ? 'INSERT' : 'UPDATE',
            'table_name' => 'activity_sessions',
            'record_id' => $event->session->id,
            'old_data' => $event instanceof ActivitySessionUpdated ? $event->oldData : null,
            'new_data' => $event->session->toArray(),
            'ip_address' => Request::ip(),
        ]);
    }
}
