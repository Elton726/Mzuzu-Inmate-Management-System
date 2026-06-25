<?php

namespace App\Modules\Admissions\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Admissions\Models\Admission;
use App\Modules\Admissions\Models\Cell;
use App\Modules\Admissions\Models\CellAllocation;
use App\Modules\Admissions\Models\Inmate;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * Generate an admissions operational report for a given period.
     *
     * Query parameters:
     *   - period : daily | weekly | monthly | yearly  (default: monthly)
     *   - date   : ISO date string used to anchor the period
     *             daily   → YYYY-MM-DD
     *             weekly  → any date within the target week
     *             monthly → YYYY-MM
     *             yearly  → YYYY
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
            'meta'              => $this->buildMeta($period, $label, $from, $to),
            'population'        => $this->populationSummary(),
            'admissions'        => $this->admissionsActivity($from, $to),
            'remand'            => $this->remandManagement(),
            'capacity'          => $this->cellCapacity(),
        ]);
    }

    // -------------------------------------------------------------------------
    // Date range resolution
    // -------------------------------------------------------------------------

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
                // Accept YYYY-MM or YYYY-MM-DD
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
            'period'         => $period,
            'label'          => $label,
            'from'           => $from->toDateString(),
            'to'             => $to->toDateString(),
            'generated_at'   => now()->toIso8601String(),
            'generated_by'   => auth()->user()?->name ?? 'System',
        ];
    }

    // -------------------------------------------------------------------------
    // Section 1 – Population Summary (current snapshot)
    // -------------------------------------------------------------------------

    private function populationSummary(): array
    {
        $currentAdmissions = Admission::query()
            ->where('is_current', true)
            ->with('inmate')
            ->get();

        $total = $currentAdmissions->count();

        // By inmate type
        $byType = $currentAdmissions
            ->groupBy('inmate_type')
            ->map(fn($g) => $g->count())
            ->toArray();

        // By gender (from inmate relationship)
        $byGender = $currentAdmissions
            ->groupBy(fn($a) => $a->inmate?->gender ?? 'unknown')
            ->map(fn($g) => $g->count())
            ->toArray();

        // Young offenders
        $youngOffenders = $currentAdmissions
            ->filter(fn($a) => $a->inmate?->is_young_offender)
            ->count();

        // By nationality (top 10)
        $byNationality = $currentAdmissions
            ->groupBy(fn($a) => $a->inmate?->nationality ?? 'Unknown')
            ->map(fn($g) => $g->count())
            ->sortDesc()
            ->take(10)
            ->toArray();

        // Admission type breakdown (all-time, for current inmates)
        $byAdmissionType = $currentAdmissions
            ->groupBy('admission_type')
            ->map(fn($g) => $g->count())
            ->toArray();

        return [
            'total'              => $total,
            'by_inmate_type'     => $byType,
            'by_gender'          => $byGender,
            'young_offenders'    => $youngOffenders,
            'by_nationality'     => $byNationality,
            'by_admission_type'  => $byAdmissionType,
        ];
    }

    // -------------------------------------------------------------------------
    // Section 2 – Admissions Activity (within the period)
    // -------------------------------------------------------------------------

    private function admissionsActivity(Carbon $from, Carbon $to): array
    {
        $admissions = Admission::query()
            ->whereBetween('admission_date', [$from->toDateString(), $to->toDateString()])
            ->with(['inmate', 'admittedBy'])
            ->get();

        $total = $admissions->count();

        $byType = $admissions
            ->groupBy('inmate_type')
            ->map(fn($g) => $g->count())
            ->toArray();

        $byAdmissionType = $admissions
            ->groupBy('admission_type')
            ->map(fn($g) => $g->count())
            ->toArray();

        // By officer
        $byOfficer = $admissions
            ->groupBy(fn($a) => $a->admittedBy?->name ?? 'Unknown')
            ->map(fn($g) => $g->count())
            ->sortDesc()
            ->toArray();

        // By court
        $byCourt = $admissions
            ->filter(fn($a) => !empty($a->court_name))
            ->groupBy('court_name')
            ->map(fn($g) => $g->count())
            ->sortDesc()
            ->take(10)
            ->toArray();

        // Daily trend: count per day
        $dailyTrend = $admissions
            ->groupBy(fn($a) => Carbon::parse($a->admission_date)->toDateString())
            ->map(fn($g) => $g->count())
            ->sortKeys()
            ->toArray();

        // Documents uploaded for these admissions
        $admissionIds = $admissions->pluck('id');
        $documentCount = \App\Modules\Admissions\Models\Document::query()
            ->whereIn('admission_id', $admissionIds)
            ->count();

        return [
            'total'            => $total,
            'by_inmate_type'   => $byType,
            'by_admission_type'=> $byAdmissionType,
            'by_officer'       => $byOfficer,
            'by_court'         => $byCourt,
            'documents_uploaded'=> $documentCount,
            'daily_trend'      => $dailyTrend,
        ];
    }

    // -------------------------------------------------------------------------
    // Section 3 – Remand Management (current snapshot)
    // -------------------------------------------------------------------------

    private function remandManagement(): array
    {
        $today = Carbon::today();
        $in7   = $today->copy()->addDays(7);
        $in30  = $today->copy()->addDays(30);

        $remandAdmissions = Admission::query()
            ->where('is_current', true)
            ->whereIn('inmate_type', ['remandee', 'murder_remandee'])
            ->with('inmate')
            ->get();

        $total = $remandAdmissions->count();

        $overdue = $remandAdmissions->filter(
            fn($a) => $a->remand_next_court_date && Carbon::parse($a->remand_next_court_date)->lt($today)
        );

        $dueThisWeek = $remandAdmissions->filter(
            fn($a) => $a->remand_next_court_date &&
                Carbon::parse($a->remand_next_court_date)->between($today, $in7)
        );

        $dueNext30Days = $remandAdmissions->filter(
            fn($a) => $a->remand_next_court_date &&
                Carbon::parse($a->remand_next_court_date)->between($today, $in30)
        );

        $avgDuration = $remandAdmissions
            ->filter(fn($a) => $a->remand_duration_days > 0)
            ->avg('remand_duration_days');

        // Build overdue list for the table
        $overdueList = $overdue->map(fn($a) => [
            'prison_number'   => $a->inmate?->prison_number,
            'name'            => trim(($a->inmate?->first_name ?? '') . ' ' . ($a->inmate?->last_name ?? '')),
            'case_number'     => $a->case_number,
            'court_date'      => $a->remand_next_court_date?->toDateString(),
            'days_overdue'    => (int) Carbon::parse($a->remand_next_court_date)->diffInDays($today),
            'inmate_type'     => $a->inmate_type,
            'admission_id'    => $a->id,
        ])->values()->toArray();

        return [
            'total_remandees'         => $total,
            'overdue_count'           => $overdue->count(),
            'due_this_week_count'     => $dueThisWeek->count(),
            'due_next_30_days_count'  => $dueNext30Days->count(),
            'average_remand_days'     => $avgDuration ? round($avgDuration, 1) : null,
            'overdue_list'            => $overdueList,
        ];
    }

    // -------------------------------------------------------------------------
    // Section 4 – Cell & Capacity (current snapshot)
    // -------------------------------------------------------------------------

    private function cellCapacity(): array
    {
        $cells = Cell::all();

        $totalCapacity   = $cells->sum('capacity');
        $totalOccupancy  = $cells->sum('current_occupancy');
        $occupancyRate   = $totalCapacity > 0
            ? round(($totalOccupancy / $totalCapacity) * 100, 1)
            : 0;

        $atOrOverCapacity = $cells->filter(
            fn($c) => $c->current_occupancy >= $c->capacity
        )->count();

        $availableBeds = max(0, $totalCapacity - $totalOccupancy);

        // By block
        $byBlock = $cells->groupBy('block')->map(fn($blockCells) => [
            'capacity'        => $blockCells->sum('capacity'),
            'occupancy'       => $blockCells->sum('current_occupancy'),
            'occupancy_rate'  => $blockCells->sum('capacity') > 0
                ? round(($blockCells->sum('current_occupancy') / $blockCells->sum('capacity')) * 100, 1)
                : 0,
            'cells_count'     => $blockCells->count(),
            'at_capacity'     => $blockCells->filter(fn($c) => $c->current_occupancy >= $c->capacity)->count(),
        ])->toArray();

        // Unallocated: is_current but no active cell_allocation
        $currentInmateIds = Admission::where('is_current', true)->pluck('inmate_id');
        $allocatedInmateIds = CellAllocation::whereIn('inmate_id', $currentInmateIds)
            ->whereNull('deallocated_date')
            ->pluck('inmate_id');

        $unallocatedCount = $currentInmateIds->diff($allocatedInmateIds)->count();

        return [
            'total_capacity'       => $totalCapacity,
            'total_occupancy'      => $totalOccupancy,
            'occupancy_rate'       => $occupancyRate,
            'available_beds'       => $availableBeds,
            'at_or_over_capacity'  => $atOrOverCapacity,
            'unallocated_inmates'  => $unallocatedCount,
            'by_block'             => $byBlock,
        ];
    }
}
