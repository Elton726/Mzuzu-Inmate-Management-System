<?php

namespace App\Modules\Visitation\Models;

use App\Models\User;
use App\Modules\Admissions\Models\Inmate;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VisitationRule extends Model
{
    use HasFactory;

    protected $fillable = [
        'inmate_id',
        'rule_type',
        'description',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function inmate(): BelongsTo
    {
        return $this->belongsTo(Inmate::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
