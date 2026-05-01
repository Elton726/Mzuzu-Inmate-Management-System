<?php

namespace App\Modules\Visitation\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    public function visitationStatistics()
    {
        return response()->json(DB::table('visitation_statistics')->get());
    }

    public function todaySchedule(Request $request)
    {
        $date = $request->query('date', 'today');
        $target = match ($date) {
            'tomorrow' => now()->tomorrow()->toDateString(),
            default => now()->toDateString(),
        };

        return response()->json(DB::table('active_visitation_schedule')->where('visit_date', $target)->get());
    }

    public function pendingCharity()
    {
        return response()->json(DB::table('pending_charity_approvals')->get());
    }
}
