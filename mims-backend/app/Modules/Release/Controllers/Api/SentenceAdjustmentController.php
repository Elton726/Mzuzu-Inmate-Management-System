<?php

namespace App\Modules\Release\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Release\Models\SentenceAdjustmentType;
use App\Modules\Release\Requests\StoreSentenceAdjustmentRequest;
use App\Modules\Release\Services\SentenceAdjustmentService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use RuntimeException;

class SentenceAdjustmentController extends Controller
{
    public function __construct(
        protected SentenceAdjustmentService $sentenceAdjustmentService
    ) {}

    public function index(int $admissionId, Request $request)
    {
        $validated = $request->validate([
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $perPage = $validated['per_page'] ?? 25;
        $page = $validated['page'] ?? 1;

        $adjustments = $this->sentenceAdjustmentService->listAdjustments($admissionId);

        $total = $adjustments->count();
        $adjustments = $adjustments->slice(($page - 1) * $perPage, $perPage)->values();

        return response()->json([
            'data' => $adjustments,
            'total' => $total,
            'per_page' => $perPage,
            'current_page' => $page,
            'last_page' => ceil($total / $perPage),
        ]);
    }

    public function storeLegacy(Request $request)
    {
        $validated = $request->validate([
            'admission_id' => ['required', 'integer', 'exists:admissions,id'],
            'adjustment_type' => ['required', 'string', Rule::in(SentenceAdjustmentType::activeNames())],
            'adjustment_days' => ['required', 'integer', 'min:1'],
            'effective_date' => ['required', 'date'],
            'reason' => ['nullable', 'string'],
        ]);

        try {
            $result = $this->sentenceAdjustmentService->applyAdjustment(
                (int) $validated['admission_id'],
                $validated['adjustment_type'],
                (int) $validated['adjustment_days'],
                $validated['effective_date'],
                $validated['reason'] ?? null,
                (int) $request->user()->id,
                $request->ip(),
            );

            return response()->json($result, 201);
        } catch (RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    public function store(int $admissionId, StoreSentenceAdjustmentRequest $request)
    {
        try {
            $result = $this->sentenceAdjustmentService->applyAdjustment(
                $admissionId,
                $request->string('adjustment_type')->toString(),
                (int) $request->integer('adjustment_days'),
                $request->date('effective_date')->toDateString(),
                $request->string('reason')->toString() ?: null,
                (int) $request->user()->id,
                $request->ip(),
            );

            return response()->json($result, 201);
        } catch (RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    public function destroy(int $adjustmentId)
    {
        $this->sentenceAdjustmentService->deleteAdjustment($adjustmentId);

        return response()->json(null, 204);
    }
}
