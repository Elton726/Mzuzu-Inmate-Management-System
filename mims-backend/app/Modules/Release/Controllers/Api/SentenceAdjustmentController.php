<?php

namespace App\Modules\Release\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Release\Requests\StoreSentenceAdjustmentRequest;
use App\Modules\Release\Services\SentenceAdjustmentService;
use RuntimeException;

class SentenceAdjustmentController extends Controller
{
    public function __construct(
        protected SentenceAdjustmentService $sentenceAdjustmentService
    ) {}

    public function index(int $admissionId)
    {
        return response()->json($this->sentenceAdjustmentService->listAdjustments($admissionId));
    }

    public function store(StoreSentenceAdjustmentRequest $request)
    {
        try {
            $result = $this->sentenceAdjustmentService->applyAdjustment(
                (int) $request->integer('admission_id'),
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
