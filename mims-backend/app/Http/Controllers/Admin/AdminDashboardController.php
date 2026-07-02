<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use App\Modules\ActivityAllocation\Models\OfficerDutyRoster;
use App\Modules\Admissions\Models\Activity;
use App\Modules\Admissions\Models\Admission;
use App\Modules\Admissions\Models\Cell;
use App\Modules\Admissions\Models\Inmate;
use App\Modules\Release\Models\ReleaseClearanceChecklist;
use App\Modules\Release\Models\ReleaseWorkflow;
use App\Modules\Release\Models\SentenceAdjustmentType;
use App\Modules\Visitation\Models\CharityBooking;
use App\Modules\Visitation\Models\VisitItemFlagReview;
use App\Modules\Visitation\Models\VisitSession;
use Illuminate\Support\Facades\DB;

class AdminDashboardController extends Controller
{
    public function overview()
    {
        $today = now()->toDateString();
        $weekStart = now()->startOfWeek()->toDateString();
        $weekEnd = now()->endOfWeek()->toDateString();

        $population = $this->populationSummary();
        $cells = $this->cellSummary();
        $release = $this->releaseSummary();
        $visitation = $this->visitationSummary($today);
        $rosters = $this->rosterSummary($today, $weekStart, $weekEnd);
        $activities = $this->activitySummary();
        $users = $this->userSummary();
        $audit = $this->auditSummary();
        $court = $this->courtSummary($today);

        return response()->json([
            'generated_at' => now()->toIso8601String(),
            'metrics' => [
                'active_inmates' => $population['active_inmates'],
                'available_cells' => $cells['available_cells'],
                'overcrowded_cells' => $cells['overcrowded_cells'],
                'pending_release_approvals' => $release['pending_approvals'],
                'pending_release_confirmations' => $release['pending_confirmations'],
                'court_due_or_overdue' => $court['due_or_overdue'],
                'visitation_flags' => $visitation['flag_reviews_pending'],
                'duty_roster_gaps' => $rosters['gaps'],
            ],
            'action_queue' => $this->actionQueue($court, $cells, $release, $visitation, $rosters),
            'population' => $population,
            'cells' => $cells,
            'release' => $release,
            'visitation' => $visitation,
            'rosters' => $rosters,
            'activities' => $activities,
            'users' => $users,
            'audit' => $audit,
            'court' => $court,
            'quick_links' => [
                ['label' => 'Manage users', 'to' => '/admin/users'],
                ['label' => 'Manage cells', 'to' => '/admin/cells'],
                ['label' => 'Duty rosters', 'to' => '/admin/duty-rosters'],
                ['label' => 'Activities', 'to' => '/admin/activities'],
                ['label' => 'Visitation rules', 'to' => '/admin/visitation-rules'],
                ['label' => 'Sentence types', 'to' => '/admin/sentence-adjustment-types'],
                ['label' => 'Audit logs', 'to' => '/admin/audit-logs'],
            ],
        ]);
    }

    private function populationSummary(): array
    {
        $currentAdmissions = Admission::query()->where('is_current', true);

        $byType = (clone $currentAdmissions)
            ->select('inmate_type', DB::raw('COUNT(*) as total'))
            ->groupBy('inmate_type')
            ->pluck('total', 'inmate_type');

        $byGender = Inmate::query()
            ->where('status', 'active')
            ->select('gender', DB::raw('COUNT(*) as total'))
            ->groupBy('gender')
            ->pluck('total', 'gender');

        $monthlyAdmissions = Admission::query()
            ->selectRaw("EXTRACT(MONTH FROM admission_date) as month_number, COUNT(*) as total")
            ->whereYear('admission_date', now()->year)
            ->whereNotNull('admission_date')
            ->groupByRaw('EXTRACT(MONTH FROM admission_date)')
            ->pluck('total', 'month_number');

        return [
            'total_inmates' => Inmate::query()->count(),
            'active_inmates' => Inmate::query()->where('status', 'active')->count(),
            'released_inmates' => Inmate::query()->where('status', 'released')->count(),
            'deceased_inmates' => Inmate::query()->where('status', 'deceased')->count(),
            'transferred_inmates' => Inmate::query()->where('status', 'transferred')->count(),
            'by_type' => [
                'convict' => (int) ($byType['convict'] ?? 0),
                'remandee' => (int) ($byType['remandee'] ?? 0),
                'murder_remandee' => (int) ($byType['murder_remandee'] ?? 0),
            ],
            'by_gender' => $byGender,
            'monthly_admissions' => collect(range(1, 12))->map(fn ($month) => [
                'month' => $month,
                'count' => (int) ($monthlyAdmissions[$month] ?? 0),
            ])->values(),
        ];
    }

    private function cellSummary(): array
    {
        $cells = Cell::query()->get(['id', 'cell_number', 'block', 'gender', 'security_classification', 'capacity', 'current_occupancy', 'status']);
        $overcrowded = $cells->filter(fn ($cell) => (int) $cell->current_occupancy > (int) $cell->capacity);
        $available = $cells->filter(fn ($cell) => $cell->status === 'available' && (int) $cell->current_occupancy < (int) $cell->capacity);

        return [
            'total_cells' => $cells->count(),
            'available_cells' => $available->count(),
            'overcrowded_cells' => $overcrowded->count(),
            'maintenance_cells' => $cells->where('status', 'maintenance')->count(),
            'capacity' => (int) $cells->sum('capacity'),
            'occupancy' => (int) $cells->sum('current_occupancy'),
            'overcrowded_samples' => $overcrowded->take(5)->values(),
            'by_security' => $cells
                ->groupBy(fn ($cell) => $cell->security_classification ?: 'unspecified')
                ->map(fn ($group) => [
                    'cells' => $group->count(),
                    'capacity' => (int) $group->sum('capacity'),
                    'occupancy' => (int) $group->sum('current_occupancy'),
                ]),
        ];
    }

    private function releaseSummary(): array
    {
        $pendingApprovals = ReleaseWorkflow::query()
            ->with(['admission.inmate:id,first_name,last_name,prison_number'])
            ->where('status', 'pending_approval')
            ->latest('id')
            ->limit(5)
            ->get();

        $pendingConfirmations = ReleaseWorkflow::query()
            ->with(['admission.inmate:id,first_name,last_name,prison_number'])
            ->where('status', 'approved')
            ->latest('approved_at')
            ->limit(5)
            ->get();

        return [
            'pending_approvals' => ReleaseWorkflow::query()->where('status', 'pending_approval')->count(),
            'pending_confirmations' => ReleaseWorkflow::query()->where('status', 'approved')->count(),
            'confirmed_this_month' => ReleaseWorkflow::query()
                ->where('status', 'confirmed')
                ->whereMonth('confirmed_at', now()->month)
                ->whereYear('confirmed_at', now()->year)
                ->count(),
            'open_clearance_checklists' => ReleaseClearanceChecklist::query()
                ->where(fn ($query) => $query->where('all_items_cleared', false)->orWhereNull('completed_at'))
                ->count(),
            'sentence_adjustment_types' => SentenceAdjustmentType::query()->count(),
            'pending_approval_samples' => $pendingApprovals,
            'pending_confirmation_samples' => $pendingConfirmations,
        ];
    }

    private function visitationSummary(string $today): array
    {
        return [
            'sessions_today' => VisitSession::query()->whereDate('created_at', $today)->count(),
            'active_sessions' => VisitSession::query()->whereIn('status', ['pending', 'checked_in'])->count(),
            'denied_today' => VisitSession::query()->whereDate('created_at', $today)->where('status', 'denied')->count(),
            'pending_charity_bookings' => CharityBooking::query()->where('status', 'pending')->count(),
            'flag_reviews_pending' => VisitItemFlagReview::query()->where('status', 'pending')->count(),
            'flag_review_samples' => VisitItemFlagReview::query()
                ->with(['session.inmate:id,first_name,last_name,prison_number', 'item'])
                ->where('status', 'pending')
                ->latest('created_at')
                ->limit(5)
                ->get(),
        ];
    }

    private function rosterSummary(string $today, string $weekStart, string $weekEnd): array
    {
        $activeCurrent = OfficerDutyRoster::query()
            ->with('officer:id,name,email')
            ->active()
            ->whereDate('duty_week_start', '<=', $today)
            ->whereDate('duty_week_end', '>=', $today)
            ->get();

        $weekRosters = OfficerDutyRoster::query()
            ->with('officer:id,name,email')
            ->whereDate('duty_week_start', '<=', $weekEnd)
            ->whereDate('duty_week_end', '>=', $weekStart)
            ->latest('duty_week_start')
            ->limit(6)
            ->get();

        return [
            'current_officers' => $activeCurrent,
            'current_officer_count' => $activeCurrent->count(),
            'weekly_rosters' => $weekRosters,
            'gaps' => $activeCurrent->isEmpty() ? 1 : 0,
        ];
    }

    private function activitySummary(): array
    {
        return [
            'active_activities' => Activity::query()->where('is_active', true)->count(),
            'inactive_activities' => Activity::query()->where('is_active', false)->count(),
            'internal_activities' => Activity::query()->where('source_type', 'internal')->count(),
            'external_activities' => Activity::query()->where('source_type', 'external')->count(),
            'recent_activities' => Activity::query()
                ->latest('updated_at')
                ->limit(5)
                ->get(['id', 'name', 'activity_type', 'source_type', 'is_active', 'updated_at']),
        ];
    }

    private function userSummary(): array
    {
        return [
            'total_users' => User::query()->count(),
            'by_role' => User::query()
                ->join('roles', 'users.role_id', '=', 'roles.id')
                ->selectRaw('roles.name as role, COUNT(*) as total')
                ->groupBy('roles.name')
                ->pluck('total', 'role'),
            'recent_users' => User::query()
                ->with('role:id,name')
                ->latest('created_at')
                ->limit(5)
                ->get(['id', 'name', 'email', 'role_id', 'created_at']),
        ];
    }

    private function auditSummary(): array
    {
        return [
            'events_today' => AuditLog::query()->whereDate('created_at', now()->toDateString())->count(),
            'recent_events' => AuditLog::query()
                ->with('user:id,name,email')
                ->latest('created_at')
                ->limit(8)
                ->get(['id', 'user_id', 'action', 'table_name', 'record_id', 'ip_address', 'created_at']),
        ];
    }

    private function courtSummary(string $today): array
    {
        $dueAdmissions = Admission::query()
            ->with('inmate:id,first_name,last_name,prison_number')
            ->where('is_current', true)
            ->whereIn('inmate_type', ['remandee', 'murder_remandee'])
            ->whereNotNull('remand_next_court_date')
            ->whereDate('remand_next_court_date', '<=', $today);

        return [
            'due_or_overdue' => (clone $dueAdmissions)->count(),
            'samples' => $dueAdmissions
                ->orderBy('remand_next_court_date')
                ->limit(5)
                ->get(['id', 'inmate_id', 'inmate_type', 'case_number', 'court_name', 'remand_next_court_date']),
        ];
    }

    private function actionQueue(array $court, array $cells, array $release, array $visitation, array $rosters): array
    {
        return collect([
            [
                'key' => 'court_due',
                'severity' => $court['due_or_overdue'] > 0 ? 'critical' : 'ok',
                'title' => 'Court dates due or overdue',
                'count' => $court['due_or_overdue'],
                'description' => 'Remand admissions requiring court follow-up.',
                'to' => null,
                'action' => 'Coordinate follow-up',
            ],
            [
                'key' => 'overcrowded_cells',
                'severity' => $cells['overcrowded_cells'] > 0 ? 'critical' : 'ok',
                'title' => 'Overcrowded cells',
                'count' => $cells['overcrowded_cells'],
                'description' => 'Cells where current occupancy exceeds capacity.',
                'to' => '/admin/cells',
                'action' => 'Open cells',
            ],
            [
                'key' => 'release_approvals',
                'severity' => $release['pending_approvals'] > 0 ? 'warning' : 'ok',
                'title' => 'Release approvals pending',
                'count' => $release['pending_approvals'],
                'description' => 'Release workflows awaiting station officer approval.',
                'to' => null,
                'action' => 'Coordinate approval',
            ],
            [
                'key' => 'release_confirmations',
                'severity' => $release['pending_confirmations'] > 0 ? 'warning' : 'ok',
                'title' => 'Release confirmations pending',
                'count' => $release['pending_confirmations'],
                'description' => 'Approved releases awaiting gate confirmation.',
                'to' => null,
                'action' => 'Coordinate gate',
            ],
            [
                'key' => 'visitation_flags',
                'severity' => $visitation['flag_reviews_pending'] > 0 ? 'warning' : 'ok',
                'title' => 'Visitation flags pending',
                'count' => $visitation['flag_reviews_pending'],
                'description' => 'Flagged visit items requiring review.',
                'to' => null,
                'action' => 'Coordinate review',
            ],
            [
                'key' => 'duty_roster',
                'severity' => $rosters['gaps'] > 0 ? 'critical' : 'ok',
                'title' => 'Duty roster coverage',
                'count' => $rosters['gaps'],
                'description' => 'Current week officer duty coverage gaps.',
                'to' => '/admin/duty-rosters',
                'action' => 'Assign officer',
            ],
        ])->sortByDesc(fn ($item) => match ($item['severity']) {
            'critical' => 3,
            'warning' => 2,
            default => 1,
        })->values()->all();
    }
}
