<?php

namespace App\Modules\Visitation\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VisitationItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'visitation_session_id',
        'item_description',
        'item_category',
        'quantity',
        'inspected_by',
        'is_approved',
        'inspection_notes',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'is_approved' => 'boolean',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(VisitationSession::class, 'visitation_session_id');
    }

    public function inspector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'inspected_by');
    }
}
