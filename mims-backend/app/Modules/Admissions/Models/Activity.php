<?php

namespace App\Modules\Admissions\Models;

use App\Models\User;
use App\Modules\ActivityAllocation\Models\ActivityCategory;
use App\Modules\ActivityAllocation\Models\ExternalActivityDetail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Activity extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'activity_type',
        'source_type',
        'category_id',
        'eligibility_criteria',
        'max_participants',
        'is_active',
        'security_level',
        'created_by',
        'modified_by',
    ];

    protected $casts = [
        'eligibility_criteria' => 'array',
        'is_active' => 'boolean',
        'max_participants' => 'integer',
    ];

    public function inmateActivities(): HasMany
    {
        return $this->hasMany(InmateActivity::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ActivityCategory::class, 'category_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function modifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'modified_by');
    }

    public function externalDetails(): HasOne
    {
        return $this->hasOne(ExternalActivityDetail::class, 'activity_id');
    }
}
