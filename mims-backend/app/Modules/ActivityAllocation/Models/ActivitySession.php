<?php

namespace App\Modules\ActivityAllocation\Models;

use Illuminate\Database\Eloquent\Model;
use App\Modules\Admissions\Models\Activity;
use App\Models\User;

class ActivitySession extends Model
{
    protected $table = 'activity_sessions';

    protected $fillable = [
        'activity_id', 'session_date', 'session_time', 'supervising_officer_id',
        'start_time', 'end_time', 'status', 'notes', 'created_by',
    ];

    protected $casts = [
        'session_date' => 'date:Y-m-d',
        'start_time' => 'datetime:H:i:s',
        'end_time' => 'datetime:H:i:s',
    ];

    public function activity()
    {
        return $this->belongsTo(Activity::class);
    }

    public function supervisingOfficer()
    {
        return $this->belongsTo(User::class, 'supervising_officer_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function attendances()
    {
        return $this->hasMany(SessionAttendance::class, 'session_id');
    }
}
