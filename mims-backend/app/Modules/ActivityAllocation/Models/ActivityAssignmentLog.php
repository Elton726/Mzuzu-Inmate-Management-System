<?php

namespace App\Modules\ActivityAllocation\Models;

use App\Models\User;
use App\Modules\Admissions\Models\InmateActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityAssignmentLog extends Model
{
    use HasFactory;

    protected $table = 'activity_assignment_logs';

    protected $fillable = [
        'inmate_activity_id',
        'assigned_by',
        'assignment_reason',
        'notes',
    ];

    public function inmateActivity(): BelongsTo
    {
        return $this->belongsTo(InmateActivity::class, 'inmate_activity_id');
    }

    public function assigner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }
}

