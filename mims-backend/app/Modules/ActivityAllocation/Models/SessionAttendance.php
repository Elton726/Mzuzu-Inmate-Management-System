<?php

namespace App\Modules\ActivityAllocation\Models;

use Illuminate\Database\Eloquent\Model;
use App\Modules\Admissions\Models\Inmate;
use App\Modules\Admissions\Models\Admission;
use App\Models\User;

class SessionAttendance extends Model
{
    protected $table = 'session_attendance';

    protected $fillable = [
        'session_id', 'inmate_id', 'admission_id', 'attendance_status',
        'notes', 'recorded_by', 'recorded_at',
    ];

    protected $casts = [
        'recorded_at' => 'datetime',
    ];

    public function session()
    {
        return $this->belongsTo(ActivitySession::class);
    }

    public function inmate()
    {
        return $this->belongsTo(Inmate::class);
    }

    public function admission()
    {
        return $this->belongsTo(Admission::class);
    }

    public function recorder()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
