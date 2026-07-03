<?php

namespace App\Modules\ActivityAllocation\Services\Officer;

use App\Modules\Admissions\Models\Activity;
use App\Modules\Admissions\Models\Admission;
use App\Modules\Admissions\Models\InmateActivity;
use App\Modules\ActivityAllocation\Models\ActivityAssignmentLog;
use App\Modules\ActivityAllocation\Models\ActivityRotationQueue;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class InternalActivityAutoAssignService
{
    /**
     * Get the current rotation cycle status for an internal activity.
     */
    public function getRotationStatus(int $activityId): array
    {
        $activity = $this->getInternalActivity($activityId);

        $currentCycle = $this->getCurrentCycleNumber($activityId);

        // Populate initial queue if empty
        $queueCount = ActivityRotationQueue::query()
            ->where('activity_id', $activityId)
            ->where('cycle_number', $currentCycle)
            ->count();

        if ($queueCount === 0) {
            $this->populateCycle($activity, $currentCycle);
        }

        // Add any missing eligible inmates who were added mid-cycle
        $this->syncMidCycleInmates($activity, $currentCycle);

        $queueEntries = ActivityRotationQueue::query()
            ->where('activity_id', $activityId)
            ->where('cycle_number', $currentCycle)
            ->with(['inmate', 'admission'])
            ->orderBy('queue_position')
            ->get();

        $served = $queueEntries->whereNotNull('served_at');
        $unserved = $queueEntries->whereNull('served_at');

        $eligibleCount = $this->getEligibleAdmissions($activity)->count();

        return [
            'activity' => $activity->load(['category']),
            'cycle_number' => $currentCycle,
            'total_in_queue' => $queueEntries->count(),
            'served_count' => $served->count(),
            'remaining_count' => $unserved->count(),
            'eligible_inmates_count' => $eligibleCount,
            'max_participants' => $activity->max_participants,
            'queue' => $queueEntries->map(fn ($entry) => [
                'id' => $entry->id,
                'queue_position' => $entry->queue_position,
                'inmate_id' => $entry->inmate_id,
                'admission_id' => $entry->admission_id,
                'inmate_name' => trim(($entry->inmate?->first_name ?? '') . ' ' . ($entry->inmate?->last_name ?? '')),
                'prison_number' => $entry->inmate?->prison_number,
                'served_at' => $entry->served_at?->toDateTimeString(),
                'is_served' => $entry->served_at !== null,
            ])->values(),
            'next_up' => $unserved->take($activity->max_participants ?? 5)->map(fn ($entry) => [
                'inmate_id' => $entry->inmate_id,
                'inmate_name' => trim(($entry->inmate?->first_name ?? '') . ' ' . ($entry->inmate?->last_name ?? '')),
                'prison_number' => $entry->inmate?->prison_number,
                'queue_position' => $entry->queue_position,
            ])->values(),
        ];
    }

    /**
     * Auto-assign inmates to an internal activity using the rotation algorithm.
     */
    public function autoAssignRotating(int $activityId, int $slots, int $assignedBy): array
    {
        $activity = $this->getInternalActivity($activityId);

        if ($slots < 1) {
            throw new RuntimeException('Number of slots must be at least 1.');
        }

        return DB::transaction(function () use ($activity, $activityId, $slots, $assignedBy) {
            $currentCycle = $this->getCurrentCycleNumber($activityId);

            // Ensure the queue is populated for the current cycle
            $queueCount = ActivityRotationQueue::query()
                ->where('activity_id', $activityId)
                ->where('cycle_number', $currentCycle)
                ->count();

            if ($queueCount === 0) {
                $this->populateCycle($activity, $currentCycle);
            }

            // Sync newly admitted inmates into the queue
            $this->syncMidCycleInmates($activity, $currentCycle);

            // Get unserved inmates from the current cycle
            $unserved = ActivityRotationQueue::query()
                ->where('activity_id', $activityId)
                ->where('cycle_number', $currentCycle)
                ->whereNull('served_at')
                ->orderBy('queue_position')
                ->get();

            $selected = collect();

            if ($unserved->count() < $slots) {
                // Take all remaining unserved from current cycle
                $selected = $selected->concat($unserved);
                $remainingSlots = $slots - $unserved->count();

                // Increment cycle
                $newCycle = $currentCycle + 1;
                $this->populateCycle($activity, $newCycle);

                // Fetch new cycle unserved
                $newUnserved = ActivityRotationQueue::query()
                    ->where('activity_id', $activityId)
                    ->where('cycle_number', $newCycle)
                    ->whereNull('served_at')
                    ->orderBy('queue_position')
                    ->get();

                $selected = $selected->concat($newUnserved->take($remainingSlots));
                $currentCycle = $newCycle;
            } else {
                $selected = $unserved->take($slots);
            }

            if ($selected->isEmpty()) {
                return [
                    'message' => 'No eligible inmates available for rotation assignment.',
                    'activity_id' => $activityId,
                    'cycle_number' => $currentCycle,
                    'allocated_count' => 0,
                    'allocations' => [],
                ];
            }

            // Close any existing active assignments for selected inmates on this activity
            $selectedInmateIds = $selected->pluck('inmate_id')->unique()->toArray();
            InmateActivity::query()
                ->where('activity_id', $activityId)
                ->whereIn('inmate_id', $selectedInmateIds)
                ->whereNull('end_date')
                ->update(['end_date' => now()->toDateString()]);

            $allocations = [];

            foreach ($selected as $queueEntry) {
                // Create the inmate_activities assignment
                $assignment = InmateActivity::query()->create([
                    'inmate_id' => $queueEntry->inmate_id,
                    'admission_id' => $queueEntry->admission_id,
                    'activity_id' => $activityId,
                    'assigned_date' => now()->toDateString(),
                    'assigned_by' => $assignedBy,
                    'notes' => "Auto rotation cycle #{$queueEntry->cycle_number}",
                ]);

                // Log the assignment
                ActivityAssignmentLog::query()->create([
                    'inmate_activity_id' => $assignment->id,
                    'assigned_by' => $assignedBy,
                    'assignment_reason' => "auto rotation cycle #{$queueEntry->cycle_number}",
                    'notes' => null,
                ]);

                // Mark as served in the rotation queue
                $queueEntry->update(['served_at' => now()]);

                $allocations[] = [
                    'inmate_activity_id' => $assignment->id,
                    'inmate_id' => $queueEntry->inmate_id,
                    'admission_id' => $queueEntry->admission_id,
                    'inmate_name' => trim(($queueEntry->inmate?->first_name ?? '') . ' ' . ($queueEntry->inmate?->last_name ?? '')),
                    'prison_number' => $queueEntry->inmate?->prison_number,
                    'queue_position' => $queueEntry->queue_position,
                ];
            }

            return [
                'message' => count($allocations) . ' inmate(s) assigned via rotation.',
                'activity_id' => $activityId,
                'cycle_number' => $currentCycle,
                'allocated_count' => count($allocations),
                'allocations' => $allocations,
            ];
        });
    }

    /**
     * Populate a rotation cycle with all currently eligible inmates.
     */
    private function populateCycle(Activity $activity, int $cycleNumber): void
    {
        $eligibleAdmissions = $this->getEligibleAdmissions($activity);

        if ($eligibleAdmissions->isEmpty()) {
            return;
        }

        // Deterministic order: sort by prison_number for consistency
        $sorted = $eligibleAdmissions->sortBy(fn (Admission $a) => $a->inmate?->prison_number ?? '');

        $position = 1;
        foreach ($sorted as $admission) {
            ActivityRotationQueue::query()->create([
                'activity_id' => $activity->id,
                'inmate_id' => $admission->inmate_id,
                'admission_id' => $admission->id,
                'queue_position' => $position,
                'cycle_number' => $cycleNumber,
            ]);
            $position++;
        }
    }

    /**
     * Check for any newly eligible inmates who aren't in the current cycle queue and add them at the end.
     */
    private function syncMidCycleInmates(Activity $activity, int $cycleNumber): void
    {
        $eligibleAdmissions = $this->getEligibleAdmissions($activity);
        if ($eligibleAdmissions->isEmpty()) {
            return;
        }

        $existingInmateIds = ActivityRotationQueue::query()
            ->where('activity_id', $activity->id)
            ->where('cycle_number', $cycleNumber)
            ->pluck('inmate_id')
            ->toArray();

        $maxPosition = (int) ActivityRotationQueue::query()
            ->where('activity_id', $activity->id)
            ->where('cycle_number', $cycleNumber)
            ->max('queue_position');

        $position = $maxPosition + 1;
        foreach ($eligibleAdmissions as $admission) {
            if (!in_array($admission->inmate_id, $existingInmateIds, true)) {
                ActivityRotationQueue::query()->create([
                    'activity_id' => $activity->id,
                    'inmate_id' => $admission->inmate_id,
                    'admission_id' => $admission->id,
                    'queue_position' => $position,
                    'cycle_number' => $cycleNumber,
                ]);
                $position++;
            }
        }
    }

    /**
     * Get the current (highest) cycle number for an activity, defaulting to 1.
     */
    private function getCurrentCycleNumber(int $activityId): int
    {
        return (int) (ActivityRotationQueue::query()
            ->where('activity_id', $activityId)
            ->max('cycle_number') ?? 1);
    }

    /**
     * Get all currently eligible admissions for an internal activity.
     * Filters: active inmate, current admission, not released, meets eligibility criteria.
     */
    private function getEligibleAdmissions(Activity $activity)
    {
        $query = Admission::query()
            ->with(['inmate'])
            ->where('is_current', true)
            ->whereNull('released_at')
            ->whereHas('inmate', function ($q) {
                $q->where('status', 'active');
            });

        $criteria = is_array($activity->eligibility_criteria) ? $activity->eligibility_criteria : [];

        return $query
            ->get()
            ->filter(function (Admission $admission) use ($criteria) {
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
            })
            ->values();
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

    /**
     * Validate and return an internal activity.
     */
    private function getInternalActivity(int $activityId): Activity
    {
        $activity = Activity::query()->findOrFail($activityId);

        if (!$activity->is_active) {
            throw new RuntimeException('This activity is not active.');
        }
        if ($activity->activity_type !== 'internal') {
            throw new RuntimeException('Rotation auto-assignment is only supported for internal activities.');
        }

        return $activity;
    }
}
