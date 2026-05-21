<?php

namespace App\Modules\Visitation\Events;

use App\Modules\Visitation\Models\VisitationDenial;
use App\Modules\Visitation\Models\VisitationSession;

class VisitationDenied
{
    public function __construct(
        public VisitationSession $session,
        public VisitationDenial $denial,
        public ?int $userId = null,
        public ?string $ipAddress = null
    ) {}
}
