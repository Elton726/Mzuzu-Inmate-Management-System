<?php

namespace App\Modules\ActivityAllocation\Events;

use App\Modules\ActivityAllocation\Models\SessionAttendance;
use Illuminate\Foundation\Events\Dispatchable;

class AttendanceRecorded
{
    use Dispatchable;

    public function __construct(public SessionAttendance $attendance) {}
}
