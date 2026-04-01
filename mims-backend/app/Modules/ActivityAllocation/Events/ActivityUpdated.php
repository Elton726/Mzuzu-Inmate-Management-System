<?php

namespace App\Modules\ActivityAllocation\Events;

use App\Modules\Admissions\Models\Activity;
use Illuminate\Foundation\Events\Dispatchable;

class ActivityUpdated
{
    use Dispatchable;

    public function __construct(
        public Activity $activity,
        public array $oldData = []
    ) {}
}

