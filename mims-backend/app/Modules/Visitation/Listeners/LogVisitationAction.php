<?php

namespace App\Modules\Visitation\Listeners;

use App\Models\AuditLog;
use App\Modules\Visitation\Events\CharityPDFGenerated;
use App\Modules\Visitation\Events\VisitationCancelled;
use App\Modules\Visitation\Events\VisitationCheckedIn;
use App\Modules\Visitation\Events\VisitationCheckedOut;
use App\Modules\Visitation\Events\VisitationDenied;
use App\Modules\Visitation\Events\VisitationScheduled;
use App\Modules\Visitation\Events\VisitorApproved;
use App\Modules\Visitation\Events\VisitorRegistered;

class LogVisitationAction
{
    public function handle(object $event): void
    {
        $action = 'INSERT';
        $tableName = 'unknown';
        $recordId = null;
        $oldData = null;
        $newData = null;
        $userId = $event->userId ?? null;
        $ipAddress = $event->ipAddress ?? null;

        if ($event instanceof VisitorRegistered) {
            $tableName = 'visitors';
            $recordId = $event->visitor->id;
            $newData = $event->visitor->toArray();
        } elseif ($event instanceof VisitorApproved) {
            $tableName = 'visitors';
            $recordId = $event->visitor->id;
            $action = 'UPDATE';
            $newData = $event->visitor->toArray();
        } elseif ($event instanceof VisitationScheduled) {
            $tableName = 'visitation_sessions';
            $recordId = $event->session->id;
            $newData = $event->session->toArray();
        } elseif ($event instanceof CharityPDFGenerated) {
            $tableName = 'visitation_sessions';
            $recordId = $event->session->id;
            $action = 'UPDATE';
            $newData = $event->session->toArray();
        } elseif ($event instanceof VisitationCheckedIn || $event instanceof VisitationCheckedOut || $event instanceof VisitationCancelled) {
            $tableName = 'visitation_sessions';
            $recordId = $event->session->id;
            $action = 'UPDATE';
            $newData = $event->session->toArray();
        } elseif ($event instanceof VisitationDenied) {
            $tableName = 'visitation_denials';
            $recordId = $event->denial->id;
            $newData = $event->denial->toArray();
        }

        AuditLog::query()->create([
            'user_id' => $userId,
            'action' => $action,
            'table_name' => $tableName,
            'record_id' => $recordId,
            'old_data' => $oldData,
            'new_data' => $newData,
            'ip_address' => $ipAddress,
        ]);
    }
}
