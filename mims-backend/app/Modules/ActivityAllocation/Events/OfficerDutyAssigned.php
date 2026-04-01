<?php

namespace App\Modules\ActivityAllocation\Events;

use App\Modules\ActivityAllocation\Models\OfficerDutyRoster;
use Illuminate\Foundation\Events\Dispatchable;

class OfficerDutyAssigned
{
    use Dispatchable;

    public function __construct(
        public OfficerDutyRoster $roster
    ) {}
}

