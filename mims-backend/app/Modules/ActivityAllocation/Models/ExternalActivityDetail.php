<?php

namespace App\Modules\ActivityAllocation\Models;

use App\Modules\Admissions\Models\Activity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExternalActivityDetail extends Model
{
    use HasFactory;

    protected $table = 'external_activity_details';

    protected $fillable = [
        'activity_id',
        'location',
        'external_partner',
        'requires_transport',
        'transport_details',
        'safety_requirements',
        'supervisor_requirements',
    ];

    protected $casts = [
        'requires_transport' => 'boolean',
    ];

    public function activity(): BelongsTo
    {
        return $this->belongsTo(Activity::class, 'activity_id');
    }
}

