<?php

namespace App\Modules\ActivityAllocation\Controllers\Officer;

use App\Http\Controllers\Controller;
use App\Modules\ActivityAllocation\Services\Officer\InternalActivityAutoAssignService;
use Illuminate\Http\Request;

class InternalActivityAutoAssignController extends Controller
{
    public function __construct(protected InternalActivityAutoAssignService $service) {}

    /**
     * Get the current rotation cycle status for an internal activity.
     */
    public function status(int $activityId)
    {
        try {
            return response()->json($this->service->getRotationStatus($activityId));
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /**
     * Auto-assign inmates using the rotation algorithm.
     */
    public function autoAssign(Request $request, int $activityId)
    {
        $request->validate([
            'slots' => 'required|integer|min:1|max:100',
        ]);

        try {
            return response()->json(
                $this->service->autoAssignRotating(
                    $activityId,
                    (int) $request->input('slots'),
                    (int) $request->user()->id
                ),
                201
            );
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }
}
