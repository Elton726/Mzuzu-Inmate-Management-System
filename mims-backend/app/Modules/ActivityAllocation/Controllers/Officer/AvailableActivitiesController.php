<?php

namespace App\Modules\ActivityAllocation\Controllers\Officer;

use App\Http\Controllers\Controller;
use App\Modules\ActivityAllocation\Services\Officer\AvailableActivityService;
use Illuminate\Http\Request;

class AvailableActivitiesController extends Controller
{
    public function __construct(protected AvailableActivityService $service) {}

    public function index(Request $request)
    {
        return response()->json($this->service->listAvailable($request->all()));
    }

    public function assignedInmates(int $activityId)
    {
        $assignedInmates = \App\Modules\Admissions\Models\InmateActivity::where('activity_id', $activityId)
            ->whereNull('end_date')
            ->with(['inmate', 'admission'])
            ->get()
            ->map(function ($assignment) {
                return [
                    'inmate_id' => $assignment->inmate->id,
                    'inmate_name' => $assignment->inmate->first_name . ' ' . $assignment->inmate->last_name,
                    'prison_number' => $assignment->inmate->prison_number,
                    'admission_id' => $assignment->admission_id,
                ];
            });

        return response()->json($assignedInmates);
    }
}

