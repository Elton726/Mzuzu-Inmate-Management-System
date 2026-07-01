<?php

namespace App\Modules\Release\Services;

use App\Modules\Release\Events\ClearanceChecklistCompleted;
use App\Modules\Release\Events\ClearanceChecklistInitiated;
use App\Modules\Release\Models\ReleaseClearanceChecklist;
use App\Modules\Release\Models\ReleaseClearanceChecklistItem;
use App\Modules\Release\Repositories\ReleaseClearanceRepository;
use RuntimeException;

class ReleaseClearanceService
{
    public function __construct(
        protected ReleaseClearanceRepository $repository
    ) {}

    /**
     * Initiate a clearance checklist for a release workflow
     */
    public function initiateClearanceChecklist(int $admissionId, int $initiatedBy, ?int $releaseWorkflowId = null): ReleaseClearanceChecklist
    {
        $existing = $this->repository->getChecklistByAdmission($admissionId);
        if ($existing) {
            throw new RuntimeException('A clearance checklist already exists for this admission.');
        }

        // Create the checklist
        $checklist = $this->repository->createChecklist([
            'release_workflow_id' => $releaseWorkflowId,
            'admission_id' => $admissionId,
            'initiated_by' => $initiatedBy,
            'all_items_cleared' => false,
        ]);

        // Create default checklist items
        $items = [
            ['type' => 'warrant_verified', 'label' => 'Warrant Verified'],
            ['type' => 'no_pending_court_order', 'label' => 'No Pending Court Order'],
            ['type' => 'no_disciplinary_case', 'label' => 'No Outstanding Disciplinary Case'],
            ['type' => 'medical_clearance', 'label' => 'Medical Clearance'],
            ['type' => 'property_returned', 'label' => 'Property Returned'],
            ['type' => 'program_exit_completed', 'label' => 'Activity/Program Exit Completed'],
            ['type' => 'next_of_kin_notified', 'label' => 'Next-of-Kin Notified'],
        ];

        $this->repository->createChecklistItems($checklist->id, $items);
        $checklist = $checklist->refresh()->load('items');

        event(new ClearanceChecklistInitiated($checklist, $initiatedBy));

        return $checklist;
    }

    /**
     * Clear a checklist item
     */
    public function clearItem(int $itemId, int $clearedBy, ?string $notes = null): ReleaseClearanceChecklistItem
    {
        return $this->repository->markItemCleared($itemId, $clearedBy, $notes);
    }

    /**
     * Unclear a checklist item (revert clearing)
     */
    public function unclearItem(int $itemId): ReleaseClearanceChecklistItem
    {
        return $this->repository->markItemUncleared($itemId);
    }

    /**
     * Complete the clearance checklist (mark as completed)
     */
    public function completeChecklist(int $checklistId, int $completedBy): ReleaseClearanceChecklist
    {
        $checklist = $this->repository->completeChecklist($checklistId, $completedBy);
        
        event(new ClearanceChecklistCompleted($checklist, $completedBy));

        return $checklist;
    }

    /**
     * Check if all items are cleared for a checklist
     */
    public function isChecklistFullyCleared(int $checklistId): bool
    {
        return $this->repository->isChecklistComplete($checklistId);
    }

    /**
     * Get checklist with all details
     */
    public function getChecklistDetails(int $checklistId): ReleaseClearanceChecklist
    {
        return $this->repository->getChecklistById($checklistId);
    }

    /**
     * Get checklist for a specific workflow
     */
    public function getChecklistByWorkflow(int $workflowId): ?ReleaseClearanceChecklist
    {
        return $this->repository->getChecklistByWorkflow($workflowId);
    }

    public function getChecklistByAdmission(int $admissionId): ?ReleaseClearanceChecklist
    {
        return $this->repository->getChecklistByAdmission($admissionId);
    }

    /**
     * Get clearance status summary
     */
    public function getClearanceStatus(int $checklistId): array
    {
        $checklist = $this->repository->getChecklistById($checklistId);
        $total = $checklist->getTotalCount();
        $cleared = $checklist->getClearedCount();
        $percentage = $this->repository->getCompletionPercentage($checklistId);

        return [
            'checklist_id' => $checklist->id,
            'workflow_id' => $checklist->release_workflow_id,
            'admission_id' => $checklist->admission_id,
            'total_items' => $total,
            'cleared_items' => $cleared,
            'pending_items' => $total - $cleared,
            'completion_percentage' => $percentage,
            'all_cleared' => $checklist->all_items_cleared,
            'is_fully_cleared' => $this->repository->isChecklistComplete($checklistId),
            'initiated_at' => $checklist->initiated_at,
            'completed_at' => $checklist->completed_at,
            'items' => $checklist->items->map(fn ($item) => [
                'id' => $item->id,
                'type' => $item->item_type,
                'label' => $item->item_label,
                'is_cleared' => $item->is_cleared,
                'cleared_at' => $item->cleared_at,
                'cleared_by' => $item->clearer?->name,
                'verification_notes' => $item->verification_notes,
            ]),
        ];
    }

    /**
     * Validate that all clearances are completed before release approval
     */
    public function validateClearanceForApproval(int $admissionId): bool
    {
        $checklist = $this->repository->getChecklistByAdmission($admissionId);

        if (!$checklist) {
            throw new RuntimeException('No clearance checklist found for this admission. Please initiate the clearance process first.');
        }

        if (!$checklist->all_items_cleared) {
            throw new RuntimeException('Not all clearance items have been verified. Please complete all items before approval.');
        }

        return true;
    }
}
