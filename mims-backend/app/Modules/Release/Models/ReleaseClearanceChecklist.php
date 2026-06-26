<?php

namespace App\Modules\Release\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ReleaseClearanceChecklist extends Model
{
    use HasFactory;

    protected $table = 'release_clearance_checklists';

    protected $fillable = [
        'release_workflow_id',
        'admission_id',
        'initiated_by',
        'initiated_at',
        'completed_by',
        'completed_at',
        'all_items_cleared',
    ];

    protected $casts = [
        'initiated_at' => 'datetime',
        'completed_at' => 'datetime',
        'all_items_cleared' => 'boolean',
    ];

    public function workflow(): BelongsTo
    {
        return $this->belongsTo(ReleaseWorkflow::class, 'release_workflow_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(ReleaseClearanceChecklistItem::class, 'clearance_checklist_id');
    }

    public function initiator(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'initiated_by');
    }

    public function completer(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'completed_by');
    }

    /**
     * Check if all checklist items are cleared
     */
    public function isFullyCleared(): bool
    {
        return $this->items()->count() > 0 && $this->items()->where('is_cleared', false)->count() === 0;
    }

    /**
     * Get count of cleared items
     */
    public function getClearedCount(): int
    {
        return $this->items()->where('is_cleared', true)->count();
    }

    /**
     * Get total item count
     */
    public function getTotalCount(): int
    {
        return $this->items()->count();
    }
}
