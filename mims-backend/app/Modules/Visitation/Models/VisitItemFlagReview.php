<?php

namespace App\Modules\Visitation\Models;

use App\Models\User;
use App\Modules\Visitation\Models\Concerns\UsesUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VisitItemFlagReview extends Model
{
    use UsesUuidPrimaryKey;

    protected $fillable = [
        'visit_item_id',
        'visit_session_id',
        'status',
        'resolution',
        'notes',
        'created_by',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(VisitItem::class, 'visit_item_id');
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(VisitSession::class, 'visit_session_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
