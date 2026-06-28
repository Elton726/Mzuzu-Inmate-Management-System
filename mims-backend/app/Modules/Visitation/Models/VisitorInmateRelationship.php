<?php

namespace App\Modules\Visitation\Models;

use App\Models\User;
use App\Modules\Admissions\Models\Inmate;
use App\Modules\Visitation\Models\Concerns\UsesUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VisitorInmateRelationship extends Model
{
    use UsesUuidPrimaryKey;

    protected $fillable = [
        'visitor_id',
        'inmate_id',
        'relationship_type',
        'notes',
        'is_approved',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'is_approved' => 'boolean',
        'approved_at' => 'datetime',
    ];

    public function visitor(): BelongsTo
    {
        return $this->belongsTo(Visitor::class);
    }

    public function inmate(): BelongsTo
    {
        return $this->belongsTo(Inmate::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
