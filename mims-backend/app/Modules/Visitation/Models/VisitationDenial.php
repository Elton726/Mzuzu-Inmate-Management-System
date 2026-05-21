<?php

namespace App\Modules\Visitation\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VisitationDenial extends Model
{
    use HasFactory;

    protected $fillable = [
        'visitation_session_id',
        'reason',
        'denied_by',
        'denial_date',
        'notes',
    ];

    protected $casts = [
        'denial_date' => 'datetime',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(VisitationSession::class, 'visitation_session_id');
    }

    public function deniedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'denied_by');
    }
}
