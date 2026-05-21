<?php

namespace App\Modules\Release\Models;

use App\Models\User;
use App\Modules\Admissions\Models\Admission;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReleaseWorkflow extends Model
{
    use HasFactory;

    protected $table = 'release_workflow';

    protected $fillable = [
        'admission_id',
        'approved_by',
        'approved_at',
        'approval_notes',
        'confirmed_by',
        'confirmed_at',
        'confirmation_notes',
        'cancelled_by',
        'cancelled_at',
        'cancellation_reason',
        'status',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
        'confirmed_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function admission(): BelongsTo
    {
        return $this->belongsTo(Admission::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function confirmer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }

    public function canceller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    public function scopePendingApproval(Builder $query): Builder
    {
        return $query->where('status', 'pending_approval');
    }

    public function scopeApproved(Builder $query): Builder
    {
        return $query->where('status', 'approved');
    }

    public function scopeConfirmed(Builder $query): Builder
    {
        return $query->where('status', 'confirmed');
    }
}
