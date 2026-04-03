<?php

namespace App\Modules\ActivityAllocation\Events;

use Illuminate\Foundation\Events\Dispatchable;
use App\Modules\ActivityAllocation\Models\ActivitySession;

class ActivitySessionCreated
{
    use Dispatchable;

    public function __construct(public ActivitySession $session) {}
}
