<?php

namespace App\Modules\Visitation\Models;

use App\Models\User;
use App\Modules\Admissions\Models\Inmate;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Visitor extends Model
{
    use HasFactory;

    protected $fillable = [
        'first_name',
        'last_name',
        'relationship',
        'contact_number',
        'national_id',
        'email',
        'is_approved',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'is_approved' => 'boolean',
        'approved_at' => 'datetime',
    ];

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function registrations(): HasMany
    {
        return $this->hasMany(InmateVisitorRegistration::class);
    }

    public function inmates(): BelongsToMany
    {
        return $this->belongsToMany(Inmate::class, 'inmate_visitor_registrations', 'visitor_id', 'inmate_id')
            ->withPivot(['registered_date', 'is_active', 'notes'])
            ->withTimestamps();
    }

    public function visitationSessions(): HasMany
    {
        return $this->hasMany(VisitationSession::class);
    }
}
