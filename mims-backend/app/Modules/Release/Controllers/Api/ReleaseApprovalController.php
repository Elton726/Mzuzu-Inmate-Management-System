<?php

namespace App\Modules\Release\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Release\Requests\ApproveReleaseRequest;
use App\Modules\Release\Requests\CancelReleaseRequest;
use App\Modules\Release\Services\ReleaseService;
use RuntimeException;

class ReleaseApprovalController extends Controller
{
    public function __construct(
        protected ReleaseService $releaseService
    ) {}

    public function index()
    {
        return response()->json($this->releaseService->getEligibleInmates());
    }

    public function store(ApproveReleaseRequest $request)
    {
        try {
            $workflow = $this->releaseService->approveRelease(
                (int) $request->integer('admission_id'),
                (int) $request->user()->id,
                $request->string('notes')->toString() ?: null,
                $request->ip(),
            );

            return response()->json($workflow, 201);
        } catch (RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    public function destroy(int $workflowId, CancelReleaseRequest $request)
    {
        try {
            $this->releaseService->cancelRelease(
                $workflowId,
                (int) $request->user()->id,
                $request->string('reason')->toString() ?: null,
                $request->ip(),
            );

            return response()->json(null, 204);
        } catch (RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }
}
