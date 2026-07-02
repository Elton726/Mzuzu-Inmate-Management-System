<?php

namespace App\Modules\Release\Repositories;

use App\Modules\Release\Models\ReleaseClearanceChecklist;
use App\Modules\Release\Models\ReleaseClearanceChecklistItem;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ReleaseClearanceRepository
{
    /**
     * Create a new clearance checklist for a release workflow
     */
    public function createChecklist(array $data): ReleaseClearanceChecklist
    {
        return ReleaseClearanceChecklist::query()->create($data);
    }

    /**
     * Create checklist items for a clearance checklist
     */
    public function createChecklistItems(int $checklistId, array $items): Collection
    {
        $createdItems = collect();

        foreach ($items as $item) {
            $createdItems->push(
                ReleaseClearanceChecklistItem::query()->create([
                    'clearance_checklist_id' => $checklistId,
                    'item_type'              => $item['type'],
                    'item_label'             => $item['label'],
                    'is_cleared'             => false,
                ])
            );
        }

        return $createdItems;
    }

    /**
     * Get checklist by ID with items
     */
    public function getChecklistById(int $checklistId): ?ReleaseClearanceChecklist
    {
        return ReleaseClearanceChecklist::query()
            ->with([
                'items',
                'initiator:id,name',
                'completer:id,name',
            ])
            ->findOrFail($checklistId);
    }

    /**
     * Get checklist by release workflow ID
     */
    public function getChecklistByWorkflow(int $workflowId): ?ReleaseClearanceChecklist
    {
        return ReleaseClearanceChecklist::query()
            ->where('release_workflow_id', $workflowId)
            ->with([
                'items',
                'initiator:id,name',
                'completer:id,name',
            ])
            ->first();
    }

    /**
     * Get checklist by admission ID (most recent active one)
     */
    public function getChecklistByAdmission(int $admissionId): ?ReleaseClearanceChecklist
    {
        return ReleaseClearanceChecklist::query()
            ->where('admission_id', $admissionId)
            ->with([
                'items',
                'initiator:id,name',
                'completer:id,name',
            ])
            ->latest('id')
            ->first();
    }

    /**
     * Mark checklist item as cleared
     */
    public function markItemCleared(int $itemId, int $userId, ?string $notes = null): ReleaseClearanceChecklistItem
    {
        $item = ReleaseClearanceChecklistItem::query()->findOrFail($itemId);

        $item->update([
            'is_cleared'         => true,
            'cleared_by'         => $userId,
            'cleared_at'         => now(),
            'verification_notes' => $notes,
        ]);

        $item->checklist()->update([
            'all_items_cleared' => false,
            'completed_by'      => null,
            'completed_at'      => null,
        ]);

        return $item->refresh();
    }

    /**
     * Mark checklist item as not cleared
     */
    public function markItemUncleared(int $itemId): ReleaseClearanceChecklistItem
    {
        $item = ReleaseClearanceChecklistItem::query()->findOrFail($itemId);

        $item->update([
            'is_cleared'         => false,
            'cleared_by'         => null,
            'cleared_at'         => null,
            'verification_notes' => null,
        ]);

        $item->checklist()->update([
            'all_items_cleared' => false,
            'completed_by'      => null,
            'completed_at'      => null,
        ]);

        return $item->refresh();
    }

    /**
     * Update checklist completion status
     */
    public function completeChecklist(int $checklistId, int $userId): ReleaseClearanceChecklist
    {
        $checklist = ReleaseClearanceChecklist::query()->findOrFail($checklistId);

        // Verify all items are cleared
        $uncleared = $checklist->items()->where('is_cleared', false)->count();

        if ($uncleared > 0) {
            throw new \RuntimeException('Cannot complete checklist with uncleared items.');
        }

        $checklist->update([
            'all_items_cleared' => true,
            'completed_by'      => $userId,
            'completed_at'      => now(),
        ]);

        return $checklist->refresh();
    }

    /**
     * Check if all items in a checklist are cleared
     */
    public function isChecklistComplete(int $checklistId): bool
    {
        $checklist = ReleaseClearanceChecklist::query()->findOrFail($checklistId);

        return $checklist->isFullyCleared();
    }

    /**
     * Get checklist completion percentage
     */
    public function getCompletionPercentage(int $checklistId): int
    {
        $checklist = ReleaseClearanceChecklist::query()->findOrFail($checklistId);
        $total     = $checklist->getTotalCount();

        if ($total === 0) {
            return 0;
        }

        $cleared = $checklist->getClearedCount();

        return (int) (($cleared / $total) * 100);
    }

    /**
     * Bulk-clear all specified items and mark the checklist as complete in one DB transaction.
     *
     * @param int   $checklistId
     * @param int   $userId
     * @param array $items  Array of ['id' => int, 'notes' => string|null]
     */
    public function bulkClearItemsAndComplete(int $checklistId, int $userId, array $items): ReleaseClearanceChecklist
    {
        return DB::transaction(function () use ($checklistId, $userId, $items) {
            $checklist = ReleaseClearanceChecklist::query()->findOrFail($checklistId);

            if ($checklist->all_items_cleared) {
                throw new \RuntimeException('Checklist is already completed.');
            }

            $now         = now();
            $submittedMap = collect($items)->keyBy('id');

            // Load all items and mark submitted ones as cleared
            $allItems = $checklist->items()->get();

            foreach ($allItems as $item) {
                if (isset($submittedMap[$item->id])) {
                    $item->update([
                        'is_cleared'         => true,
                        'cleared_by'         => $userId,
                        'cleared_at'         => $now,
                        'verification_notes' => $submittedMap[$item->id]['notes'] ?? null,
                    ]);
                }
            }

            // Ensure every item is cleared before marking complete
            $unclearedCount = $checklist->items()->where('is_cleared', false)->count();

            if ($unclearedCount > 0) {
                throw new \RuntimeException('All checklist items must be checked before completing.');
            }

            $checklist->update([
                'all_items_cleared' => true,
                'completed_by'      => $userId,
                'completed_at'      => $now,
            ]);

            return $checklist->fresh(['items', 'initiator:id,name', 'completer:id,name']);
        });
    }
}
