<?php

namespace App\Modules\Visitation\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Visitation\Models\CharityBooking;
use App\Modules\Visitation\Models\VisitSession;
use Dompdf\Dompdf;
use Dompdf\Options;
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
            ->with(['visitor', 'inmate', 'items', 'events.creator'])
            ->where('visit_type', '!=', 'charity')
            ->whereBetween(DB::raw('DATE(created_at)'), [$from, $to])
            ->orderByDesc('created_at')
            ->get();

        // Charity bookings (includes those that may already be converted into sessions)
        $charity = CharityBooking::query()
            ->with(['inmate', 'session.visitor', 'session.inmate', 'session.items', 'session.events.creator'])
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
            ->get()
            ->map(function (VisitSession $session) {
                $session->is_overdue = $session->expected_checkout_at
                    && ! $session->checked_out_at
                    && $session->expected_checkout_at->isPast()
                    && in_array($session->status, ['in_progress', 'checked_in', 'flagged'], true);
                $session->time_remaining_seconds = $session->expected_checkout_at && ! $session->checked_out_at
                    ? now()->diffInSeconds($session->expected_checkout_at, false)
                    : null;
                $session->time_remaining_label = $this->timeRemainingLabel($session->time_remaining_seconds);

                return $session;
            });

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
                $booking->time_remaining_seconds = null;
                $booking->time_remaining_label = 'Not checked in';

                return $booking;
            });

        return response()->json(['data' => [
            'sessions' => $sessions,
            'approved_charity' => $charity,
        ]]);
    }

    private function timeRemainingLabel(?int $seconds): string
    {
        if ($seconds === null) {
            return '-';
        }

        if ($seconds <= 0) {
            return 'Overdue';
        }

        $minutes = intdiv($seconds, 60);
        $remainingSeconds = $seconds % 60;

        return sprintf('%02d:%02d left', $minutes, $remainingSeconds);
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

    public function exportHistory(Request $request)
    {
        $data = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'format' => ['required', 'string', 'in:csv,pdf'],
        ]);

        $from = $data['from'] ?? now()->subMonth()->startOfDay()->toDateString();
        $to = $data['to'] ?? now()->toDateString();

        $sessions = VisitSession::query()
            ->with(['visitor', 'inmate', 'items'])
            ->whereBetween(DB::raw('DATE(created_at)'), [$from, $to])
            ->orderByDesc('created_at')
            ->get();

        if ($data['format'] === 'csv') {
            $csv = "Date,Visitor,Phone,Inmate,Type,Status,Checked In,Checked Out,Flagged Items\n";

            foreach ($sessions as $session) {
                $csv .= sprintf(
                    '"%s","%s","%s","%s","%s","%s","%s","%s","%s"' . "\n",
                    optional($session->created_at)->toDateTimeString(),
                    $session->visitor?->full_name ?? '',
                    $session->visitor?->phone ?? '',
                    trim(($session->inmate?->first_name ?? '') . ' ' . ($session->inmate?->last_name ?? '')),
                    $session->visit_type,
                    $session->status,
                    optional($session->checked_in_at)->toDateTimeString(),
                    optional($session->checked_out_at)->toDateTimeString(),
                    $session->items->where('status', 'flagged')->count()
                );
            }

            return response($csv, 200, [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => 'attachment; filename="visitation-history.csv"',
            ]);
        }

        $rows = $sessions->map(function (VisitSession $session) {
            return sprintf(
                '<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>',
                e(optional($session->created_at)->toDateString()),
                e($session->visitor?->full_name ?? ''),
                e(trim(($session->inmate?->first_name ?? '') . ' ' . ($session->inmate?->last_name ?? ''))),
                e($session->visit_type),
                e($session->status),
                e((string) $session->items->where('status', 'flagged')->count())
            );
        })->implode('');

        $options = new Options();
        $options->set('defaultFont', 'DejaVu Sans');

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml("
            <h1>Visitation History</h1>
            <p>Period: {$from} to {$to}</p>
            <table width=\"100%\" border=\"1\" cellspacing=\"0\" cellpadding=\"6\">
                <thead><tr><th>Date</th><th>Visitor</th><th>Inmate</th><th>Type</th><th>Status</th><th>Flagged Items</th></tr></thead>
                <tbody>{$rows}</tbody>
            </table>
        ");
        $dompdf->setPaper('a4', 'landscape');
        $dompdf->render();

        return response($dompdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="visitation-history.pdf"',
        ]);
    }

    public function alerts()
    {
        $overdue = VisitSession::query()
            ->with(['visitor', 'inmate', 'items'])
            ->whereNull('checked_out_at')
            ->whereNotNull('expected_checkout_at')
            ->where('expected_checkout_at', '<', now())
            ->whereIn('status', ['in_progress', 'checked_in', 'flagged'])
            ->latest('expected_checkout_at')
            ->get();

        $flagged = VisitSession::query()
            ->with(['visitor', 'inmate', 'items'])
            ->where('status', 'flagged')
            ->latest()
            ->limit(25)
            ->get();

        return response()->json(['data' => [
            'overdue' => $overdue,
            'flagged' => $flagged,
        ]]);
    }
}
