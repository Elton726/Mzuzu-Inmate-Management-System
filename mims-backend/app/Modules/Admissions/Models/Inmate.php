<?php

namespace App\Modules\Admissions\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use App\Modules\ActivityAllocation\Models\SessionAttendance;
use App\Modules\Visitation\Models\VisitorInmateRelationship;
use App\Modules\Visitation\Models\VisitSession;

class Inmate extends Model
{
    use HasFactory;

    protected $fillable = [
        'prison_number',
        'first_name',
        'last_name',
        'other_names',
        'date_of_birth',
        'gender',
        'is_young_offender',
        'place_of_birth',
        'nationality',
        'national_id',
        'marital_status',
        'next_of_kin_name',
        'next_of_kin_contact',
        'personal_belongings',
        'override_justification',
        'photo_path',
        'status',
        'last_release_date',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'is_young_offender' => 'boolean',
        'last_release_date' => 'date',
    ];

    public function admissions(): HasMany
    {
        return $this->hasMany(Admission::class);
    }

    public function currentAdmission(): HasOne
    {
        return $this->hasOne(Admission::class)->where('is_current', true);
    }

    public function cellAllocations(): HasMany
    {
        return $this->hasMany(CellAllocation::class);
    }

    public function inmateActivities(): HasMany
    {
        return $this->hasMany(InmateActivity::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    public function visitSessions(): HasMany
    {
        return $this->hasMany(VisitSession::class);
    }

    public function visitorRelationships(): HasMany
    {
        return $this->hasMany(VisitorInmateRelationship::class);
    }

    public function sessionAttendances(): HasMany
    {
        return $this->hasMany(SessionAttendance::class);
    }
}
