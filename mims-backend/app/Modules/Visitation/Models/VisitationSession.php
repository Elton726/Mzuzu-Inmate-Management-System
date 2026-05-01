<?php

namespace App\Modules\Visitation\Models;

use App\Models\User;
use App\Modules\Admissions\Models\Admission;
use App\Modules\Admissions\Models\Inmate;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class VisitationSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'inmate_id',
        'visitor_id',
        'admission_id',
        'visit_date',
        'visit_time',
        'duration_minutes',
        'location',
        'supervising_officer_id',
        'status',
        'visit_purpose',
        'notes',
        'checked_in_at',
        'checked_out_at',
        'is_charity_visit',
        'charity_organization',
        'charity_purpose',
        'pdf_file_path',
        'pdf_generated_at',
        'pdf_created_by',
    ];

    protected $casts = [
        'visit_date' => 'date',
        'checked_in_at' => 'datetime',
        'checked_out_at' => 'datetime',
        'is_charity_visit' => 'boolean',
        'pdf_generated_at' => 'datetime',
    ];

    public function inmate(): BelongsTo
    {
        return $this->belongsTo(Inmate::class);
    }

    public function visitor(): BelongsTo
    {
        return $this->belongsTo(Visitor::class);
    }

    public function admission(): BelongsTo
    {
        return $this->belongsTo(Admission::class);
    }

    public function supervisingOfficer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'supervising_officer_id');
    }

    public function pdfCreator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pdf_created_by');
    }

    public function denial(): HasOne
    {
        return $this->hasOne(VisitationDenial::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(VisitationItem::class);
    }
}
