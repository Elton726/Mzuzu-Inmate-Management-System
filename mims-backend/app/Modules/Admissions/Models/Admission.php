<?php

namespace App\Modules\Admissions\Models;

use App\Models\User;
use App\Modules\Release\Models\ReleaseWorkflow;
use App\Modules\Release\Models\SentenceAdjustment;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Admission extends Model
{
    use HasFactory;

    protected $fillable = [
        'inmate_id',
        'admission_date',
        'admission_type',
        'inmate_type',
        'case_number',
        'court_name',
        'offence_description',
        'sentence_years',
        'sentence_months',
        'sentence_days',
        'sentence_start_date',
        'projected_release_date',
        'original_release_date',
        'remand_next_court_date',
        'remand_duration_days',
        'committal_warrant_path',
        'remand_warrant_path',
        'admitted_by',
        'is_current',
        'released_at',
        'release_reason',
    ];

    protected $casts = [
        'admission_date' => 'date',
        'sentence_start_date' => 'date',
        'projected_release_date' => 'date',
        'original_release_date' => 'date',
        'remand_next_court_date' => 'date',
        'remand_duration_days' => 'integer',
        'released_at' => 'date',
        'is_current' => 'boolean',
    ];

    public function inmate(): BelongsTo
    {
        return $this->belongsTo(Inmate::class);
    }

    public function admittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admitted_by');
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

    public function releaseWorkflows(): HasMany
    {
        return $this->hasMany(ReleaseWorkflow::class);
    }

    public function sentenceAdjustments(): HasMany
    {
        return $this->hasMany(SentenceAdjustment::class);
    }
}
