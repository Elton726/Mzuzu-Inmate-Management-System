<?php

namespace App\Modules\Release\Events;

use App\Modules\Release\Models\ReleaseClearanceChecklist;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ClearanceChecklistInitiated
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly ReleaseClearanceChecklist $checklist,
        public readonly int $initiatedBy,
        public readonly ?string $ipAddress = null,
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('clearance-checklist'),
        ];
    }
}
