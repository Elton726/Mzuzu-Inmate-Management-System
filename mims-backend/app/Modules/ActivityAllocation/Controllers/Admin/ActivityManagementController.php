<?php

namespace App\Modules\ActivityAllocation\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Modules\ActivityAllocation\Requests\Admin\StoreActivityRequest;
use App\Modules\ActivityAllocation\Requests\Admin\StoreExternalActivityRequest;
use App\Modules\ActivityAllocation\Requests\Admin\UpdateActivityRequest;
use App\Modules\ActivityAllocation\Services\Admin\ActivityManagementService;
use Illuminate\Http\Request;
use RuntimeException;

class ActivityManagementController extends Controller
{
    public function __construct(
        protected ActivityManagementService $activityService
    ) {}

    public function index(Request $request)
    {
        return response()->json($this->activityService->listActivities($request->all()));
    }

    public function search(Request $request)
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
        ]);

        return response()->json(
            $this->activityService->searchActivitySuggestions($validated['q'] ?? '')
        );
    }

    public function show(int $id)
    {
        return response()->json($this->activityService->getActivity($id));
    }

    public function storeInternal(StoreActivityRequest $request)
    {
        $activity = $this->activityService->createInternalActivity($request->validated());
        return response()->json([
            'message' => 'Internal activity created successfully',
            'data' => $activity,
        ], 201);
    }

    public function storeExternal(StoreActivityRequest $request, StoreExternalActivityRequest $externalRequest)
    {
        $activity = $this->activityService->createExternalActivity(
            $request->validated(),
            $externalRequest->validated()
        );

        return response()->json([
            'message' => 'External activity created successfully',
            'data' => $activity,
        ], 201);
    }

    public function update(UpdateActivityRequest $request, int $id)
    {
        $activity = $this->activityService->updateActivity($id, $request->validated());
        return response()->json([
            'message' => 'Activity updated successfully',
            'data' => $activity,
        ]);
    }

    public function updateExternal(StoreExternalActivityRequest $request, int $id)
    {
        try {
            $activity = $this->activityService->updateExternalActivity($id, $request->validated());
            return response()->json([
                'message' => 'External activity details updated',
                'data' => $activity,
            ]);
        } catch (RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    public function deactivate(int $id)
    {
        $activity = $this->activityService->deactivateActivity($id);
        return response()->json([
            'message' => 'Activity deactivated',
            'data' => $activity,
        ]);
    }

    public function activate(int $id)
    {
        $activity = $this->activityService->activateActivity($id);
        return response()->json([
            'message' => 'Activity activated',
            'data' => $activity,
        ]);
    }

    public function destroy(int $id)
    {
        try {
            $this->activityService->deleteActivity($id);
            return response()->json(null, 204);
        } catch (RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    public function categories()
    {
        return response()->json($this->activityService->getCategories());
    }

    public function predefined()
    {
        return response()->json($this->activityService->getPredefinedActivities());
    }
}
