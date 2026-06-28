<?php

namespace App\Modules\Visitation\Models;

use App\Models\User;
use App\Modules\Visitation\Models\Concerns\UsesUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Visitor extends Model
{
    use UsesUuidPrimaryKey;

    protected $fillable = [
        'full_name',
        'phone',
        'is_watchlisted',
        'watchlist_reason',
        'watchlisted_by',
        'watchlisted_at',
    ];

    protected $casts = [
        'is_watchlisted' => 'boolean',
        'watchlisted_at' => 'datetime',
    ];

    public function sessions(): HasMany
    {
        return $this->hasMany(VisitSession::class);
    }

    public function inmateRelationships(): HasMany
    {
        return $this->hasMany(VisitorInmateRelationship::class);
    }

    public function watchlistedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'watchlisted_by');
    }
}
