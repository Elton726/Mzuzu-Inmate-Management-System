<?php

namespace App\Modules\Release\Listeners;

use App\Models\AuditLog;
use App\Modules\Release\Events\ReleaseApproved;
use App\Modules\Release\Events\SentenceAdjusted;

class LogReleaseAction
{
    public function handle(object $event): void
    {
        if ($event instanceof SentenceAdjusted) {
            AuditLog::query()->create([
                'user_id' => $event->userId,
                'action' => 'INSERT',
                'table_name' => 'sentence_adjustments',
                'record_id' => $event->adjustment->id,
                'old_data' => null,
                'new_data' => array_merge($event->adjustment->toArray(), $event->extraData ?? []),
                'ip_address' => $event->ipAddress,
            ]);

            return;
        }

        $action = $event instanceof ReleaseApproved ? 'INSERT' : 'UPDATE';
        $workflow = $event->workflow;

        AuditLog::query()->create([
            'user_id' => $event->userId,
            'action' => $action,
            'table_name' => 'release_workflow',
            'record_id' => $workflow->id,
            'old_data' => property_exists($event, 'oldData') ? $event->oldData : null,
            'new_data' => $workflow->toArray(),
            'ip_address' => $event->ipAddress,
        ]);
    }
}
