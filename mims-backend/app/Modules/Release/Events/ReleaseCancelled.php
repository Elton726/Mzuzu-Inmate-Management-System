<?php

namespace App\Modules\Release\Events;

use App\Modules\Release\Models\ReleaseWorkflow;

class ReleaseCancelled
{
    /**
     * @param  array<string, mixed>|null  $oldData
     */
    public function __construct(
        public ReleaseWorkflow $workflow,
        public ?int $userId = null,
        public ?string $ipAddress = null,
        public ?array $oldData = null,
    ) {}
}
