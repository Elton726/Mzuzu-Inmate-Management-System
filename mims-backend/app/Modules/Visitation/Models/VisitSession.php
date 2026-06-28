<?php

namespace App\Modules\Visitation\Models;

use App\Models\User;
use App\Modules\Admissions\Models\Inmate;
use App\Modules\Visitation\Models\Concerns\UsesUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class VisitSession extends Model
{
    use UsesUuidPrimaryKey;

    protected $fillable = [
        'visitor_id',
        'inmate_id',
        'visit_type',
        'status',
        'checked_in_at',
        'checked_out_at',
        'expected_checkout_at',
        'denial_reason',
        'denial_notes',
        'created_by',
    ];

    protected $casts = [
        'checked_in_at' => 'datetime',
        'checked_out_at' => 'datetime',
        'expected_checkout_at' => 'datetime',
    ];

    public function visitor(): BelongsTo
    {
        return $this->belongsTo(Visitor::class);
    }

    public function inmate(): BelongsTo
    {
        return $this->belongsTo(Inmate::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(VisitItem::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(VisitSessionEvent::class);
    }

    public function charityBooking(): HasOne
    {
        return $this->hasOne(CharityBooking::class);
    }
}
