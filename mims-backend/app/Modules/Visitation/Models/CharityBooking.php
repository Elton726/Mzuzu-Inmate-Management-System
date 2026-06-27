<?php

namespace App\Modules\Visitation\Models;

use App\Models\User;
use App\Modules\Admissions\Models\Inmate;
use App\Modules\Visitation\Models\Concerns\UsesUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CharityBooking extends Model
{
    use UsesUuidPrimaryKey;

    protected $fillable = [
        'visit_session_id',
        'inmate_id',
        'organisation_name',
        'contact_person',
        'contact_person_phone',
        'inmate_category',
        'purpose',
        'proposed_date',
        'proposed_time',
        'duration_minutes',
        'status',
        'approved_by',
        'approved_at',
        'pdf_path',
        'created_by',
    ];

    protected $casts = [
        'proposed_date' => 'date',
        'approved_at' => 'datetime',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(VisitSession::class, 'visit_session_id');
    }

    public function inmate(): BelongsTo
    {
        return $this->belongsTo(Inmate::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
