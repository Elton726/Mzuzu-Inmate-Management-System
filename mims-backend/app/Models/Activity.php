<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Activity extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'activity_type',
        'eligibility_criteria',
        'max_participants',
        'is_active',
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
}

