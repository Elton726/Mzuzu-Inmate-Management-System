<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityLog extends Model
{
    use HasFactory;

    // We do not have an updated_at column in our migration, let's set CREATED_AT to 'timestamp'
    const UPDATED_AT = null;
    const CREATED_AT = 'timestamp';

    protected $table = 'activity_logs';

    protected $fillable = [
        'timestamp',
        'user_id',
        'user_name',
        'user_role',
        'action',
        'ip_address',
    ];

    /**
     * Get the user who performed the activity.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
