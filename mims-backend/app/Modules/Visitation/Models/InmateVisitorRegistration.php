<?php

namespace App\Modules\Visitation\Models;

use App\Modules\Admissions\Models\Inmate;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InmateVisitorRegistration extends Model
{
    use HasFactory;

    protected $fillable = [
        'inmate_id',
        'visitor_id',
        'registered_date',
        'is_active',
        'notes',
    ];

    protected $casts = [
        'registered_date' => 'date',
        'is_active' => 'boolean',
    ];

    public function inmate(): BelongsTo
    {
        return $this->belongsTo(Inmate::class);
    }

    public function visitor(): BelongsTo
    {
        return $this->belongsTo(Visitor::class);
    }
}
