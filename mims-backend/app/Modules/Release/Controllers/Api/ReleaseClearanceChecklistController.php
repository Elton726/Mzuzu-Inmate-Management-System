<?php

namespace App\Modules\Release\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Release\Services\ReleaseClearanceService;
use Illuminate\Http\Request;
use RuntimeException;

class ReleaseClearanceChecklistController extends Controller
{
    public function __construct(
        protected ReleaseClearanceService $clearanceService
    ) {}

    /**
     * Initiate a clearance checklist for an admission
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'release_workflow_id' => ['nullable', 'integer', 'exists:release_workflow,id'],
            'admission_id'        => ['required', 'integer', 'exists:admissions,id'],
        ]);

        try {
            $checklist = $this->clearanceService->initiateClearanceChecklist(
                (int) $validated['admission_id'],
                (int) $request->user()->id,
                isset($validated['release_workflow_id']) ? (int) $validated['release_workflow_id'] : null
            );

            return response()->json([
                'message' => 'Clearance checklist initiated successfully.',
                'data'    => $this->clearanceService->getClearanceStatus($checklist->id),
            ], 201);
        } catch (RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /**
     * Get clearance checklist details
     */
    public function show(int $checklistId)
    {
        try {
            $status = $this->clearanceService->getClearanceStatus($checklistId);

            return response()->json([
                'data' => $status,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json(['error' => 'Clearance checklist not found.'], 404);
        }
    }

    /**
     * Get clearance checklist by workflow ID
     */
    public function byWorkflow(int $workflowId)
    {
        try {
            $checklist = $this->clearanceService->getChecklistByWorkflow($workflowId);

            if (!$checklist) {
                return response()->json(['error' => 'Clearance checklist not found for this workflow.'], 404);
            }

            $status = $this->clearanceService->getClearanceStatus($checklist->id);

            return response()->json([
                'data' => $status,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json(['error' => 'Workflow not found.'], 404);
        }
    }

    public function byAdmission(int $admissionId)
    {
        $checklist = $this->clearanceService->getChecklistByAdmission($admissionId);

        if (!$checklist) {
            return response()->json(['error' => 'Clearance checklist not found for this admission.'], 404);
        }

        return response()->json([
            'data' => $this->clearanceService->getClearanceStatus($checklist->id),
        ]);
    }

    /**
     * Mark a checklist item as cleared
     */
    public function clearItem(Request $request)
    {
        $validated = $request->validate([
            'checklist_item_id' => ['required', 'integer', 'exists:release_clearance_checklist_items,id'],
            'verification_notes' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $this->clearanceService->clearItem(
                (int) $validated['checklist_item_id'],
                (int) $request->user()->id,
                $validated['verification_notes'] ?? null
            );

            return response()->json([
                'message' => 'Checklist item marked as cleared.',
                'data'    => ['success' => true],
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json(['error' => 'Checklist item not found.'], 404);
        } catch (RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /**
     * Mark a checklist item as uncleared (revert)
     */
    public function unclearItem(Request $request)
    {
        $validated = $request->validate([
            'checklist_item_id' => ['required', 'integer', 'exists:release_clearance_checklist_items,id'],
        ]);

        try {
            $this->clearanceService->unclearItem((int) $validated['checklist_item_id']);

            return response()->json([
                'message' => 'Checklist item marked as uncleared.',
                'data'    => ['success' => true],
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json(['error' => 'Checklist item not found.'], 404);
        } catch (RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /**
     * Complete the entire clearance checklist
     */
    public function complete(Request $request, int $checklistId)
    {
        try {
            $checklist = $this->clearanceService->completeChecklist(
                $checklistId,
                (int) $request->user()->id
            );

            $status = $this->clearanceService->getClearanceStatus($checklist->id);

            return response()->json([
                'message' => 'Clearance checklist completed successfully.',
                'data'    => $status,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json(['error' => 'Clearance checklist not found.'], 404);
        } catch (RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /**
     * Bulk-clear all selected items and complete the checklist in one request.
     *
     * Accepts: { items: [{ id: int, notes: string|null }] }
     */
    public function bulkComplete(Request $request, int $checklistId)
    {
        $validated = $request->validate([
            'items'          => ['required', 'array', 'min:1'],
            'items.*.id'     => ['required', 'integer', 'exists:release_clearance_checklist_items,id'],
            'items.*.notes'  => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $checklist = $this->clearanceService->bulkCompleteChecklist(
                $checklistId,
                (int) $request->user()->id,
                $validated['items']
            );

            $status = $this->clearanceService->getClearanceStatus($checklist->id);

            return response()->json([
                'message' => 'Clearance checklist completed successfully.',
                'data'    => $status,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json(['error' => 'Clearance checklist not found.'], 404);
        } catch (RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /**
     * Get clearance status summary
     */
    public function status(int $checklistId)
    {
        try {
            $status = $this->clearanceService->getClearanceStatus($checklistId);

            return response()->json([
                'data' => $status,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json(['error' => 'Clearance checklist not found.'], 404);
        }
    }

    /**
     * Get available clearance item types
     */
    public function availableItems()
    {
        return response()->json([
            'data' => \App\Modules\Release\Models\ReleaseClearanceChecklistItem::getAvailableTypes(),
        ]);
    }
}
