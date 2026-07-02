<?php

namespace App\Modules\ActivityAllocation\Services\Officer;

use App\Modules\Admissions\Models\Activity;
use App\Modules\Admissions\Models\Admission;
use App\Modules\Admissions\Models\InmateActivity;
use App\Modules\ActivityAllocation\Models\ActivityAssignmentLog;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ExternalActivityAllocationService
{
    public function getEligibleInmates(int $activityId, array $filters = []): array
    {
        $activity = $this->getExternalActivity($activityId);

        $eligibleAdmissions = $this->getEligibleAdmissions($activity, $filters);

        return [
            'activity' => $activity->load(['category', 'externalDetails']),
            'eligible_inmates' => $eligibleAdmissions->map(fn (Admission $admission) => $this->mapAdmission($admission))->values(),
            'active_assignments_count' => $this->getActiveAssignmentCount($activity->id),
            'remaining_slots' => $this->getRemainingSlots($activity),
            'sorted_by' => 'nearest_release_date',
        ];
    }

    public function allocateSelected(int $activityId, array $inmateIds, int $assignedBy, ?string $notes = null): array
    {
        $activity = $this->getExternalActivity($activityId);
        $remainingSlots = $this->getRemainingSlots($activity);

        $eligibleAdmissions = $this->getEligibleAdmissions($activity, [])
            ->whereIn('inmate_id', $inmateIds)
            ->keyBy('inmate_id');

        if ($eligibleAdmissions->count() !== count(array_unique($inmateIds))) {
            throw new RuntimeException('One or more selected inmates are not eligible for this external activity.');
        }

        if ($remainingSlots !== null && $eligibleAdmissions->count() > $remainingSlots) {
            throw new RuntimeException('Selected inmates exceed the remaining slots for this activity.');
        }

        $allocations = DB::transaction(function () use ($activity, $eligibleAdmissions, $assignedBy, $notes) {
            return $eligibleAdmissions->map(function (Admission $admission) use ($activity, $assignedBy, $notes) {
                return $this->createAllocation(
                    $activity->id,
                    $admission,
                    $assignedBy,
                    'manual external allocation',
                    $notes
                );
            });
        });

        return [
            'message' => 'Selected inmates allocated successfully.',
            'activity_id' => $activity->id,
            'allocated_count' => $allocations->count(),
            'allocations' => $allocations->values(),
        ];
    }

    public function autoAllocate(int $activityId, int $assignedBy): array
    {
        $activity = $this->getExternalActivity($activityId);
        $remainingSlots = $this->getRemainingSlots($activity);

        $eligibleAdmissions = $this->getEligibleAdmissions($activity, []);
        if ($remainingSlots !== null) {
            $eligibleAdmissions = $eligibleAdmissions->take($remainingSlots)->values();
        }

        if ($eligibleAdmissions->isEmpty()) {
            return [
                'message' => 'No eligible inmates available for automatic allocation.',
                'activity_id' => $activity->id,
                'allocated_count' => 0,
                'allocations' => [],
            ];
        }

        $allocations = DB::transaction(function () use ($activity, $eligibleAdmissions, $assignedBy) {
            return $eligibleAdmissions->map(function (Admission $admission) use ($activity, $assignedBy) {
                return $this->createAllocation(
                    $activity->id,
                    $admission,
                    $assignedBy,
                    'automatic external allocation',
                    null
                );
            });
        });

        return [
            'message' => 'Eligible inmates allocated automatically.',
            'activity_id' => $activity->id,
            'allocated_count' => $allocations->count(),
            'allocations' => $allocations->values(),
        ];
    }

    private function getEligibleAdmissions(Activity $activity, array $filters)
    {
        $driver = \Illuminate\Support\Facades\DB::getDriverName();

        // Sort by projected_release_date ASC so nearest-to-release inmates appear first.
        // NULLs (remandees with no release date) are pushed to the end.
        if ($driver === 'pgsql') {
            $query = Admission::query()
                ->with(['inmate'])
                ->where('is_current', true)
                ->whereNull('released_at')
                ->whereDoesntHave('inmateActivities', function ($assignmentQuery) use ($activity) {
                    $assignmentQuery
                        ->where('activity_id', $activity->id)
                        ->whereNull('end_date');
                })
                ->orderByRaw('projected_release_date ASC NULLS LAST')
                ->orderBy('id');
        } else {
            // SQLite / MySQL: use CASE to push NULLs last
            $query = Admission::query()
                ->with(['inmate'])
                ->where('is_current', true)
                ->whereNull('released_at')
                ->whereDoesntHave('inmateActivities', function ($assignmentQuery) use ($activity) {
                    $assignmentQuery
                        ->where('activity_id', $activity->id)
                        ->whereNull('end_date');
                })
                ->orderByRaw('CASE WHEN projected_release_date IS NULL THEN 1 ELSE 0 END')
                ->orderBy('projected_release_date')
                ->orderBy('id');
        }

        if (!empty($filters['search'])) {
            $search = trim((string) $filters['search']);
            $query->whereHas('inmate', function ($inmateQuery) use ($search) {
                $inmateQuery
                    ->where('prison_number', 'like', '%' . $search . '%')
                    ->orWhere('first_name', 'like', '%' . $search . '%')
                    ->orWhere('last_name', 'like', '%' . $search . '%');
            });
        }

        // Optional: only show inmates releasing within N days
        if (!empty($filters['release_window_days']) && is_numeric($filters['release_window_days'])) {
            $windowDays = (int) $filters['release_window_days'];
            $cutoff = now()->addDays($windowDays)->toDateString();
            $query->where(function ($q) use ($cutoff) {
                $q->whereNotNull('projected_release_date')
                  ->where('projected_release_date', '<=', $cutoff);
            });
        }

        $criteria = is_array($activity->eligibility_criteria) ? $activity->eligibility_criteria : [];

        return $query
            ->get()
            ->filter(fn (Admission $admission) => $this->meetsCriteria($admission, $criteria))
            ->values();
    }

    private function createAllocation(
        int $activityId,
        Admission $admission,
        int $assignedBy,
        string $reason,
        ?string $notes
    ): array {
        $currentAssignments = InmateActivity::query()
            ->where('inmate_id', $admission->inmate_id)
            ->where('admission_id', $admission->id)
            ->whereNull('end_date')
            ->get();

        foreach ($currentAssignments as $currentAssignment) {
            $existingNotes = trim((string) ($currentAssignment->notes ?? ''));
            $closureNote = $notes
                ? 'Closed for external allocation: ' . $notes
                : 'Closed for external allocation';

            $currentAssignment->update([
                'end_date' => now()->toDateString(),
                'notes' => $existingNotes !== '' ? $existingNotes . ' | ' . $closureNote : $closureNote,
            ]);
        }

        $assignment = null;

        if ($this->usesAbsoluteUniqueAssignmentConstraint()) {
            $assignment = InmateActivity::query()
                ->where('inmate_id', $admission->inmate_id)
                ->where('admission_id', $admission->id)
                ->latest('id')
                ->first();
        }

        if ($assignment) {
            $existingNotes = trim((string) ($assignment->notes ?? ''));
            $reassignmentNote = $notes
                ? 'Reassigned to external activity: ' . $notes
                : 'Reassigned to external activity';

            $assignment->update([
                'activity_id' => $activityId,
                'assigned_date' => now()->toDateString(),
                'end_date' => null,
                'assigned_by' => $assignedBy,
                'notes' => $existingNotes !== '' ? $existingNotes . ' | ' . $reassignmentNote : $reassignmentNote,
            ]);
        } else {
            $assignment = InmateActivity::query()->create([
                'inmate_id' => $admission->inmate_id,
                'admission_id' => $admission->id,
                'activity_id' => $activityId,
                'assigned_date' => now()->toDateString(),
                'assigned_by' => $assignedBy,
                'notes' => $notes,
            ]);
        }

        ActivityAssignmentLog::query()->create([
            'inmate_activity_id' => $assignment->id,
            'assigned_by' => $assignedBy,
            'assignment_reason' => $reason,
            'notes' => $notes,
        ]);

        return [
            'inmate_activity_id' => $assignment->id,
            'inmate_id' => $assignment->inmate_id,
            'admission_id' => $assignment->admission_id,
            'activity_id' => $assignment->activity_id,
        ];
    }

    private function usesAbsoluteUniqueAssignmentConstraint(): bool
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            $rows = DB::select("
                SELECT indexname, indexdef
                FROM pg_indexes
                WHERE schemaname = current_schema()
                  AND tablename = 'inmate_activities'
            ");

            foreach ($rows as $row) {
                $indexName = (string) ($row->indexname ?? '');
                $indexDef = (string) ($row->indexdef ?? '');

                if (
                    str_contains($indexName, 'unique_active_activity')
                    || (
                        str_contains($indexDef, 'UNIQUE INDEX')
                        && str_contains($indexDef, '(inmate_id, admission_id)')
                        && !str_contains($indexDef, 'WHERE')
                    )
                ) {
                    return true;
                }
            }

            return false;
        }

        if ($driver === 'sqlite') {
            $rows = DB::select("
                SELECT name, sql
                FROM sqlite_master
                WHERE type = 'index'
                  AND tbl_name = 'inmate_activities'
            ");

            foreach ($rows as $row) {
                $name = (string) ($row->name ?? '');
                $sql = (string) ($row->sql ?? '');

                if (
                    str_contains($name, 'unique_active_activity')
                    || (
                        str_contains($sql, 'UNIQUE')
                        && str_contains($sql, 'inmate_id')
                        && str_contains($sql, 'admission_id')
                        && !str_contains($sql, 'WHERE')
                    )
                ) {
                    return true;
                }
            }
        }

        return false;
    }

    private function getExternalActivity(int $activityId): Activity
    {
        $activity = Activity::query()->findOrFail($activityId);

        if (!$activity->is_active) {
            throw new RuntimeException('This activity is not active.');
        }
        if ($activity->activity_type !== 'external') {
            throw new RuntimeException('Only external activities support inmate allocation in this workflow.');
        }

        return $activity;
    }

    private function getActiveAssignmentCount(int $activityId): int
    {
        return InmateActivity::query()
            ->where('activity_id', $activityId)
            ->whereNull('end_date')
            ->count();
    }

    private function getRemainingSlots(Activity $activity): ?int
    {
        if (!$activity->max_participants) {
            return null;
        }

        return max(0, (int) $activity->max_participants - $this->getActiveAssignmentCount($activity->id));
    }

    private function mapAdmission(Admission $admission): array
    {
        $projectedRelease = $admission->projected_release_date;
        $daysUntilRelease = null;

        if ($projectedRelease !== null) {
            $daysUntilRelease = (int) now()->startOfDay()->diffInDays(
                $projectedRelease->startOfDay(),
                false
            );
        }

        return [
            'admission_id' => $admission->id,
            'inmate_id' => $admission->inmate_id,
            'inmate_name' => trim(($admission->inmate?->first_name ?? '') . ' ' . ($admission->inmate?->last_name ?? '')),
            'prison_number' => $admission->inmate?->prison_number,
            'inmate_type' => $admission->inmate_type,
            'admission_date' => optional($admission->admission_date)->toDateString(),
            'case_number' => $admission->case_number,
            'projected_release_date' => $projectedRelease?->toDateString(),
            'days_until_release' => $daysUntilRelease,
            'remaining_years' => $this->remainingYears($admission),
        ];
    }

    private function meetsCriteria(Admission $admission, array $criteria): bool
    {
        if (isset($criteria['allowed_inmate_types'])) {
            if (!in_array($admission->inmate_type, (array) $criteria['allowed_inmate_types'], true)) {
                return false;
            }
        }

        $minRemaining = (float) ($criteria['min_remaining_years'] ?? $criteria['min_sentence_years'] ?? 0);
        $maxRemaining = (float) ($criteria['max_remaining_years'] ?? 0);

        if ($minRemaining > 0 || $maxRemaining > 0) {
            $remainingYears = $this->remainingYears($admission);

            if ($remainingYears === null) {
                return false;
            }

            if ($remainingYears < $minRemaining) {
                return false;
            }

            if ($maxRemaining > 0 && $remainingYears > $maxRemaining) {
                return false;
            }
        }

        return true;
    }

    private function remainingYears(Admission $admission): ?float
    {
        if ($admission->admission_date === null) {
            return null;
        }

        $releaseDate = CarbonImmutable::parse($admission->admission_date)
            ->addYears((int) ($admission->sentence_years ?? 0))
            ->addMonths((int) ($admission->sentence_months ?? 0))
            ->addDays((int) ($admission->sentence_days ?? 0))
            ->startOfDay();

        $today = CarbonImmutable::now()->startOfDay();
        $remainingDays = max(0, (int) $today->diffInDays($releaseDate, false));

        return round($remainingDays / 365.25, 2);
    }
}
