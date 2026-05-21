<?php

namespace App\Modules\Visitation\Events;

use App\Modules\Visitation\Models\VisitationSession;

class VisitationCancelled
{
    public function __construct(
        public VisitationSession $session,
        public ?int $userId = null,
        public ?string $ipAddress = null
    ) {}
}
