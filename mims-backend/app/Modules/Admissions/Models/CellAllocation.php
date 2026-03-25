<?php

namespace App\Modules\Admissions\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CellAllocation extends Model
{
    use HasFactory;

    protected $fillable = [
        'inmate_id',
        'admission_id',
        'cell_id',
        'allocated_date',
        'deallocated_date',
        'reason',
    ];

    protected $casts = [
        'allocated_date' => 'date',
        'deallocated_date' => 'date',
    ];

    public function inmate(): BelongsTo
    {
        return $this->belongsTo(Inmate::class);
    }

    public function admission(): BelongsTo
    {
        return $this->belongsTo(Admission::class);
    }

    public function cell(): BelongsTo
    {
        return $this->belongsTo(Cell::class);
    }
}
