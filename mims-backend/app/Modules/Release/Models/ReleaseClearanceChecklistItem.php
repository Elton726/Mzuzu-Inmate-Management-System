<?php

namespace App\Modules\Release\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReleaseClearanceChecklistItem extends Model
{
    use HasFactory;

    protected $table = 'release_clearance_checklist_items';

    protected $fillable = [
        'clearance_checklist_id',
        'item_type',
        'item_label',
        'is_cleared',
        'cleared_by',
        'cleared_at',
        'verification_notes',
    ];

    protected $casts = [
        'is_cleared' => 'boolean',
        'cleared_at' => 'datetime',
    ];

    public function checklist(): BelongsTo
    {
        return $this->belongsTo(ReleaseClearanceChecklist::class, 'clearance_checklist_id');
    }

    public function clearer(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'cleared_by');
    }

    /**
     * Available clearance item types
     */
    public static function getAvailableTypes(): array
    {
        return [
            'warrant_verified' => 'Warrant Verified',
            'no_pending_court_order' => 'No Pending Court Order',
            'no_disciplinary_case' => 'No Outstanding Disciplinary Case',
            'medical_clearance' => 'Medical Clearance',
            'property_returned' => 'Property Returned',
            'program_exit_completed' => 'Activity/Program Exit Completed',
            'next_of_kin_notified' => 'Next-of-Kin Notified',
        ];
    }
}
