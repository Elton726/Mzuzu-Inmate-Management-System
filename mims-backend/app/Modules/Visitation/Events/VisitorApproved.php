<?php

namespace App\Modules\Visitation\Events;

use App\Modules\Visitation\Models\Visitor;

class VisitorApproved
{
    public function __construct(
        public Visitor $visitor,
        public ?int $userId = null,
        public ?string $ipAddress = null
    ) {}
}
