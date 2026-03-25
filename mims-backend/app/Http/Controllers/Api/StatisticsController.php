<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;

class StatisticsController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    public function population()
    {
        try {
            $stats = DB::table('population_statistics')->first();
            if ($stats) {
                return response()->json($stats);
            }
        } catch (\Throwable $e) {
            // Fall back to computing on the fly if the view is unavailable.
        }

        $totalInmates = DB::table('inmates')->count();
        $activeInmates = DB::table('inmates')->where('status', 'active')->count();

        $currentAdmissions = DB::table('admissions')->where('is_current', true);

        return response()->json([
            'total_inmates' => $totalInmates,
            'convict_count' => (clone $currentAdmissions)->where('inmate_type', 'convict')->count(),
            'remandee_count' => (clone $currentAdmissions)->where('inmate_type', 'remandee')->count(),
            'murder_remandee_count' => (clone $currentAdmissions)->where('inmate_type', 'murder_remandee')->count(),
            'active_inmates' => $activeInmates,
            'released_inmates' => DB::table('inmates')->where('status', 'released')->count(),
            'deceased_inmates' => DB::table('inmates')->where('status', 'deceased')->count(),
            'transferred_inmates' => DB::table('inmates')->where('status', 'transferred')->count(),
        ]);
    }
}

