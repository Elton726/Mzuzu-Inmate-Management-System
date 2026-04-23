<?php

namespace App\Modules\Release\Models;

use App\Models\User;
use App\Modules\Admissions\Models\Admission;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SentenceAdjustment extends Model
{
    use HasFactory;

    protected $fillable = [
        'admission_id',
        'adjustment_type',
        'adjustment_days',
        'effective_date',
        'reason',
        'approved_by',
    ];

    protected $casts = [
        'effective_date' => 'date',
    ];

    public function admission(): BelongsTo
    {
        return $this->belongsTo(Admission::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
