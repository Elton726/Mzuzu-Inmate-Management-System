<?php

namespace App\Modules\Release\Events;

use App\Modules\Release\Models\ReleaseWorkflow;

class ReleaseApproved
{
    public function __construct(
        public ReleaseWorkflow $workflow,
        public ?int $userId = null,
        public ?string $ipAddress = null,
    ) {}
}
