<?php

namespace App\Modules\Admissions\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Admissions\Models\Activity;

class ActivityController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    public function index()
    {
        return response()->json(
            Activity::query()
                ->select('activities.*')
                ->selectRaw("
                    CASE
                        WHEN LOWER(activities.name) = 'farm work' OR activities.activity_type = 'external' THEN 'External'
                        WHEN activities.source_type = 'custom' THEN 'Internal Custom'
                        ELSE 'Internal Predefined'
                    END AS category
                ")
                ->where('activities.is_active', true)
                ->where('activities.activity_type', 'internal')
                ->where('activities.source_type', 'predefined')
                ->orderBy('activities.name')
                ->get()
        );
    }
}
