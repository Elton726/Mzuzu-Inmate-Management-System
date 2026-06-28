<?php

namespace App\Modules\Visitation\Models;

use App\Models\User;
use App\Modules\Visitation\Models\Concerns\UsesUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VisitationNotification extends Model
{
    use UsesUuidPrimaryKey;

    protected $fillable = [
        'user_id',
        'recipient_role',
        'title',
        'message',
        'type',
        'action_url',
        'data',
        'is_read',
        'read_at',
    ];

    protected $casts = [
        'data' => 'array',
        'is_read' => 'boolean',
        'read_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
