<?php

namespace App\Modules\Release\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Release\Requests\ConfirmReleaseRequest;
use App\Modules\Release\Services\ReleaseService;
use RuntimeException;

class ReleaseConfirmationController extends Controller
{
    public function __construct(
        protected ReleaseService $releaseService
    ) {}

    public function index()
    {
        return response()->json($this->releaseService->getPendingReleases());
    }

    public function update(int $workflowId, ConfirmReleaseRequest $request)
    {
        try {
            $workflow = $this->releaseService->confirmRelease(
                $workflowId,
                (int) $request->user()->id,
                $request->string('notes')->toString() ?: null,
                $request->ip(),
            );

            return response()->json($workflow);
        } catch (RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }
}
