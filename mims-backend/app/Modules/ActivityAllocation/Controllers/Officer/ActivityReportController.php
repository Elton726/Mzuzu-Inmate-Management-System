<?php

namespace App\Modules\ActivityAllocation\Controllers\Officer;

use App\Http\Controllers\Controller;
use App\Modules\ActivityAllocation\Models\ActivitySession;
use App\Modules\ActivityAllocation\Models\SessionAttendance;
use App\Modules\Admissions\Models\Activity;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityReportController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * Generate activity sessions and participation reports.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'period' => 'sometimes|string|in:daily,weekly,monthly,yearly',
            'date'   => 'sometimes|string',
        ]);

        $period = $request->input('period', 'monthly');
        $dateInput = $request->input('date', now()->toDateString());

        [$from, $to, $label] = $this->resolveDateRange($period, $dateInput);

        return response()->json([
            'meta'       => $this->buildMeta($period, $label, $from, $to),
            'summary'    => $this->buildSummary($from, $to),
            'activities' => $this->buildActivityBreakdown($from, $to),
            'sessions'   => $this->buildSessionsList($from, $to),
            'incidents'  => $this->buildIncidentsList($from, $to),
        ]);
    }

    private function resolveDateRange(string $period, string $dateInput): array
    {
        switch ($period) {
            case 'daily':
                $day = Carbon::parse($dateInput)->startOfDay();
                return [
                    $day->copy()->startOfDay(),
                    $day->copy()->endOfDay(),
                    $day->format('d M Y'),
                ];

            case 'weekly':
                $day = Carbon::parse($dateInput);
                $start = $day->copy()->startOfWeek(Carbon::MONDAY);
                $end   = $day->copy()->endOfWeek(Carbon::SUNDAY);
                return [
                    $start->startOfDay(),
                    $end->endOfDay(),
                    $start->format('d M') . ' – ' . $end->format('d M Y'),
                ];

            case 'yearly':
                $year  = (int) (strlen($dateInput) >= 4 ? substr($dateInput, 0, 4) : date('Y'));
                $start = Carbon::create($year, 1, 1)->startOfDay();
                $end   = Carbon::create($year, 12, 31)->endOfDay();
                return [
                    $start,
                    $end,
                    (string) $year,
                ];

            case 'monthly':
            default:
                $parsed = strlen($dateInput) <= 7
                    ? Carbon::createFromFormat('Y-m', $dateInput)
                    : Carbon::parse($dateInput);
                $start = $parsed->copy()->startOfMonth()->startOfDay();
                $end   = $parsed->copy()->endOfMonth()->endOfDay();
                return [
                    $start,
                    $end,
                    $parsed->format('F Y'),
                ];
        }
    }

    private function buildMeta(string $period, string $label, Carbon $from, Carbon $to): array
    {
        return [
            'period'       => $period,
            'label'        => $label,
            'from'         => $from->toDateString(),
            'to'           => $to->toDateString(),
            'generated_at' => now()->toIso8601String(),
            'generated_by' => auth()->user()?->name ?? 'System',
        ];
    }

    private function buildSummary(Carbon $from, Carbon $to): array
    {
        $sessions = ActivitySession::whereBetween('session_date', [$from->toDateString(), $to->toDateString()])->get();

        $sessionIds = $sessions->pluck('id')->toArray();
        $attendances = SessionAttendance::whereIn('session_id', $sessionIds)->get();

        return [
            'total_sessions'     => $sessions->count(),
            'completed_sessions' => $sessions->where('status', 'completed')->count(),
            'cancelled_sessions' => $sessions->where('status', 'cancelled')->count(),
            'in_progress_sessions' => $sessions->where('status', 'in_progress')->count(),
            'total_participations' => $attendances->count(),
            'total_present'      => $attendances->where('attendance_status', 'present')->count(),
            'total_absent'       => $attendances->where('attendance_status', 'absent')->count(),
            'total_late'         => $attendances->where('attendance_status', 'late')->count(),
            'total_excused'      => $attendances->where('attendance_status', 'excused')->count(),
        ];
    }

    private function buildActivityBreakdown(Carbon $from, Carbon $to): array
    {
        $sessions = ActivitySession::whereBetween('session_date', [$from->toDateString(), $to->toDateString()])
            ->with('activity')
            ->get();

        $breakdown = [];
        $grouped = $sessions->groupBy('activity_id');

        foreach ($grouped as $activityId => $activitySessions) {
            $activity = $activitySessions->first()->activity;
            $sessionIds = $activitySessions->pluck('id')->toArray();
            $attendances = SessionAttendance::whereIn('session_id', $sessionIds)->get();

            $breakdown[] = [
                'activity_id' => $activityId,
                'activity_name' => $activity ? $activity->name : "Activity #{$activityId}",
                'activity_type' => $activity ? $activity->activity_type : 'unknown',
                'sessions_count' => $activitySessions->count(),
                'completed_count' => $activitySessions->where('status', 'completed')->count(),
                'participations_count' => $attendances->count(),
                'present_count' => $attendances->where('attendance_status', 'present')->count(),
            ];
        }

        return $breakdown;
    }

    private function buildSessionsList(Carbon $from, Carbon $to): array
    {
        $sessions = ActivitySession::whereBetween('session_date', [$from->toDateString(), $to->toDateString()])
            ->with(['activity', 'supervisingOfficer'])
            ->orderBy('session_date', 'desc')
            ->get();

        return $sessions->map(function ($s) {
            $present = $s->attendances()->where('attendance_status', 'present')->count();
            $total = $s->attendances()->count();

            return [
                'id' => $s->id,
                'session_date' => $s->session_date,
                'session_time' => $s->session_time,
                'activity_name' => $s->activity ? $s->activity->name : "Activity #{$s->activity_id}",
                'activity_type' => $s->activity ? $s->activity->activity_type : 'unknown',
                'officer_name' => $s->supervisingOfficer ? $s->supervisingOfficer->name : "Officer #{$s->supervising_officer_id}",
                'status' => $s->status,
                'present_count' => $present,
                'total_count' => $total,
            ];
        })->toArray();
    }

    private function buildIncidentsList(Carbon $from, Carbon $to): array
    {
        $sessions = ActivitySession::whereBetween('session_date', [$from->toDateString(), $to->toDateString()])->get();
        $sessionIds = $sessions->pluck('id')->toArray();

        $attendancesWithNotes = SessionAttendance::whereIn('session_id', $sessionIds)
            ->whereNotNull('notes')
            ->where('notes', '<>', '')
            ->with(['inmate', 'session.activity'])
            ->get();

        return $attendancesWithNotes->map(function ($att) {
            return [
                'session_id' => $att->session_id,
                'session_date' => $att->session?->session_date,
                'activity_name' => $att->session?->activity?->name ?? "Activity #{$att->session?->activity_id}",
                'inmate_name' => $att->inmate ? "{$att->inmate->first_name} {$att->inmate->last_name}" : "Inmate #{$att->inmate_id}",
                'prison_number' => $att->inmate?->prison_number,
                'notes' => $att->notes,
            ];
        })->toArray();
    }
}
