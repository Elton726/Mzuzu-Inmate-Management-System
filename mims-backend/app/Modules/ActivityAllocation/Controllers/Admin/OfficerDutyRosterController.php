<?php

namespace App\Modules\ActivityAllocation\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Modules\ActivityAllocation\Requests\Admin\AutoAssignOfficerDutyRequest;
use App\Modules\ActivityAllocation\Requests\Admin\StoreOfficerDutyRequest;
use App\Modules\ActivityAllocation\Requests\Admin\UpdateOfficerDutyRequest;
use App\Modules\ActivityAllocation\Services\Admin\OfficerDutyService;
use Illuminate\Http\Request;
use RuntimeException;

class OfficerDutyRosterController extends Controller
{
    public function __construct(
        protected OfficerDutyService $dutyService
    ) {}

    public function index(Request $request)
    {
        return response()->json($this->dutyService->listRosters($request->all()));
    }

    public function show(int $id)
    {
        return response()->json($this->dutyService->getRoster($id));
    }

    public function store(StoreOfficerDutyRequest $request)
    {
        try {
            $roster = $this->dutyService->assignOfficer($request->validated());
            return response()->json([
                'message' => 'Officer assigned successfully',
                'data' => $roster,
            ], 201);
        } catch (RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    public function autoAssign(AutoAssignOfficerDutyRequest $request)
    {
        $assignment = $this->dutyService->autoAssignNextWeek();

        return response()->json([
            'message' => 'Auto-assignment completed',
            'assignment' => $assignment,
        ]);
    }

    public function update(UpdateOfficerDutyRequest $request, int $id)
    {
        try {
            $roster = $this->dutyService->updateRoster($id, $request->validated());
            return response()->json([
                'message' => 'Duty roster updated',
                'data' => $roster,
            ]);
        } catch (RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    public function deactivate(int $id)
    {
        $roster = $this->dutyService->deactivateRoster($id);
        return response()->json([
            'message' => 'Duty roster deactivated',
            'data' => $roster,
        ]);
    }

    public function destroy(int $id)
    {
        $this->dutyService->deleteRoster($id);
        return response()->json(null, 204);
    }

    public function weeklySummary(Request $request)
    {
        return response()->json($this->dutyService->getWeeklySummary($request->input('week_start')));
    }

    public function currentOfficer()
    {
        $officer = $this->dutyService->getCurrentDutyOfficer();
        if (!$officer) {
            return response()->json(['message' => 'No officer assigned for this week'], 404);
        }
        return response()->json($officer);
    }
}
