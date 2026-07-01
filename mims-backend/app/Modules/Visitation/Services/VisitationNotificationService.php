<?php

namespace App\Modules\Visitation\Services;

use App\Modules\Visitation\Models\VisitationNotification;

class VisitationNotificationService
{
    public function forRole(
        string $role,
        string $title,
        string $message,
        string $type = 'info',
        ?string $actionUrl = null,
        ?array $data = null
    ): VisitationNotification {
        return VisitationNotification::query()->create([
            'recipient_role' => $role,
            'title' => $title,
            'message' => $message,
            'type' => $type,
            'action_url' => $actionUrl,
            'data' => $data,
        ]);
    }
}
