<?php

namespace App\Modules\Admissions\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cell extends Model
{
    use HasFactory;

    protected $fillable = [
        'cell_number',
        'block',
        'security_classification',
        'capacity',
        'current_occupancy',
        'status',
    ];

    protected $casts = [
        'capacity' => 'integer',
        'current_occupancy' => 'integer',
    ];

    public function allocations(): HasMany
    {
        return $this->hasMany(CellAllocation::class);
    }
}
