<?php

namespace App\Modules\ActivityAllocation\Events;

use App\Modules\ActivityAllocation\Models\ActivitySession;
use Illuminate\Foundation\Events\Dispatchable;

class ActivitySessionUpdated
{
    use Dispatchable;

    public function __construct(public ActivitySession $session) {}
}
