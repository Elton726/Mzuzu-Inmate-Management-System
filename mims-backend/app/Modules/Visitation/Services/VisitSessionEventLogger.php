<?php

namespace App\Modules\Visitation\Services;

use App\Modules\Visitation\Models\VisitSession;
use App\Modules\Visitation\Models\VisitSessionEvent;

class VisitSessionEventLogger
{
    public function log(
        VisitSession $session,
        string $eventType,
        ?string $description = null,
        ?array $metadata = null,
        ?int $userId = null
    ): VisitSessionEvent {
        return VisitSessionEvent::query()->create([
            'visit_session_id' => $session->id,
            'event_type' => $eventType,
            'description' => $description,
            'metadata' => $metadata,
            'created_by' => $userId,
        ]);
    }
}
