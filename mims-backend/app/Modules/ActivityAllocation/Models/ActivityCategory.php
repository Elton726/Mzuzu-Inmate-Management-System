<?php

namespace App\Modules\ActivityAllocation\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Modules\Admissions\Models\Activity;

class ActivityCategory extends Model
{
    use HasFactory;

    protected $table = 'activity_categories';

    protected $fillable = [
        'name',
        'description',
    ];

    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class, 'category_id');
    }
}

