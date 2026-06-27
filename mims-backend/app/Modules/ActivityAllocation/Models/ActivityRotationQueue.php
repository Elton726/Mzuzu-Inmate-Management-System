<?php

namespace App\Modules\ActivityAllocation\Models;

use App\Modules\Admissions\Models\Activity;
use App\Modules\Admissions\Models\Admission;
use App\Modules\Admissions\Models\Inmate;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityRotationQueue extends Model
{
    use HasFactory;

    protected $fillable = [
        'activity_id',
        'inmate_id',
        'admission_id',
        'queue_position',
        'cycle_number',
        'served_at',
    ];

    protected $casts = [
        'served_at' => 'datetime',
        'queue_position' => 'integer',
        'cycle_number' => 'integer',
    ];

    public function activity(): BelongsTo
    {
        return $this->belongsTo(Activity::class);
    }

    public function inmate(): BelongsTo
    {
        return $this->belongsTo(Inmate::class);
    }

    public function admission(): BelongsTo
    {
        return $this->belongsTo(Admission::class);
    }
}
