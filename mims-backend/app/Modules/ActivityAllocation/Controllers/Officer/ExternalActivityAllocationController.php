<?php

namespace App\Modules\ActivityAllocation\Controllers\Officer;

use App\Http\Controllers\Controller;
use App\Modules\ActivityAllocation\Requests\Officer\StoreExternalActivityAllocationRequest;
use App\Modules\ActivityAllocation\Services\Officer\ExternalActivityAllocationService;
use Illuminate\Http\Request;

class ExternalActivityAllocationController extends Controller
{
    public function __construct(protected ExternalActivityAllocationService $service) {}

    public function eligible(Request $request, int $activityId)
    {
        try {
            return response()->json($this->service->getEligibleInmates($activityId, $request->all()));
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    public function manual(StoreExternalActivityAllocationRequest $request, int $activityId)
    {
        try {
            return response()->json(
                $this->service->allocateSelected(
                    $activityId,
                    $request->validated('inmate_ids'),
                    (int) $request->user()->id,
                    $request->validated('notes')
                ),
                201
            );
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    public function auto(Request $request, int $activityId)
    {
        try {
            return response()->json(
                $this->service->autoAllocate(
                    $activityId,
                    (int) $request->user()->id
                ),
                201
            );
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }
}

