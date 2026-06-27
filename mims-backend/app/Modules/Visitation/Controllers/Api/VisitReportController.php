<?php

namespace App\Modules\Visitation\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Visitation\Models\CharityBooking;
use App\Modules\Visitation\Models\VisitSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;

class VisitReportController extends Controller
{
    /**
     * Visitation History
     * Returns normal visits (regular sessions) and charity visits (charity bookings / sessions)
     * within the given date range.
     *
     * Query params:
     * - from: YYYY-MM-DD (optional, default: 1 month ago)
     * - to:   YYYY-MM-DD (optional, default: today)
     */
    public function history(Request $request)
    {
        $data = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $from = $data['from'] ?? now()->subMonth()->startOfDay()->toDateString();
        $to = $data['to'] ?? now()->toDateString();

        // Normal/regular visit sessions
        $normal = VisitSession::query()
            ->with(['visitor', 'inmate', 'items'])
            ->where('visit_type', '!=', 'charity')
            ->whereBetween(DB::raw('DATE(created_at)'), [$from, $to])
            ->orderByDesc('created_at')
            ->get();

        // Charity bookings (includes those that may already be converted into sessions)
        $charity = CharityBooking::query()
            ->with(['inmate', 'session.visitor', 'session.inmate', 'session.items'])
            ->whereBetween('proposed_date', [$from, $to])
            ->orderByDesc('proposed_date')
            ->get();

        return response()->json([
            'data' => [
                'normal' => $normal,
                'charity' => $charity,
            ],
        ]);
    }

    public function todaySchedule()
    {
        $sessions = VisitSession::query()
            ->with(['visitor', 'inmate', 'items', 'charityBooking'])
            ->whereDate('created_at', today())
            ->orWhereDate('checked_in_at', today())
            ->latest()
            ->get();

        $charity = CharityBooking::query()
            ->where('status', 'approved')
            ->whereNull('visit_session_id')
            ->whereDate('proposed_date', '<=', today())
            ->whereDate('proposed_date', '>=', today()->subDays(7))
            ->orderBy('proposed_time')
            ->get()
            ->map(function (CharityBooking $booking) {
                $booking->valid_until = $booking->proposed_date->copy()->addDays(7)->toDateString();
                $booking->can_start = true;

                return $booking;
            });

        return response()->json(['data' => [
            'sessions' => $sessions,
            'approved_charity' => $charity,
        ]]);
    }

    public function pendingCharity()
    {
        // Return all recent bookings (pending + resolved) so the station officer
        // page can display both the work queue and recent history.
        $bookings = CharityBooking::query()
            ->whereDate('created_at', '>=', now()->subDays(90))
            ->latest()
            ->get()
            ->map(function (CharityBooking $booking) {
                $booking->download_url = $booking->pdf_path
                    ? URL::temporarySignedRoute('visitation.charity-pdf', now()->addMinutes(60), ['booking' => $booking->id])
                    : null;

                return $booking;
            });

        return response()->json(['data' => $bookings]);
    }

    public function statistics(Request $request)
    {
        $data = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $from = $data['from'] ?? today()->startOfWeek()->toDateString();
        $to = $data['to'] ?? today()->toDateString();

        $base = VisitSession::query()->whereBetween(DB::raw('DATE(created_at)'), [$from, $to]);

        $rangeTotal = (clone $base)->count();

        return response()->json(['data' => [
            // Totals computed consistently for the validated from/to range.
            // (UI labels use “Today/This Week”, but data is range-based.)
            'total_today' => $rangeTotal,
            'total_week' => $rangeTotal,
            'by_type' => (clone $base)
                ->select('visit_type', DB::raw('COUNT(*) as total'))
                ->groupBy('visit_type')
                ->pluck('total', 'visit_type'),
            'by_status' => (clone $base)
                ->select('status', DB::raw('COUNT(*) as total'))
                ->groupBy('status')
                ->pluck('total', 'status'),
        ]]);
    }
}
