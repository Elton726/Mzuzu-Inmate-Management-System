<?php

namespace App\Modules\ActivityAllocation\Events;

use App\Modules\ActivityAllocation\Models\OfficerDutyRoster;
use Illuminate\Foundation\Events\Dispatchable;

class OfficerDutyModified
{
    use Dispatchable;

    public function __construct(
        public OfficerDutyRoster $roster,
        public array $oldData = []
    ) {}
}

