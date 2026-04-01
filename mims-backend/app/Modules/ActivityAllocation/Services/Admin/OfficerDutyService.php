<?php

namespace App\Modules\ActivityAllocation\Services\Admin;

use App\Models\User;
use App\Modules\ActivityAllocation\Events\OfficerDutyAssigned;
use App\Modules\ActivityAllocation\Events\OfficerDutyModified;
use App\Modules\ActivityAllocation\Models\OfficerDutyRoster;
use App\Modules\ActivityAllocation\Repositories\OfficerDutyRosterRepository;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class OfficerDutyService
{
    private const EXCLUDED_ROLE_NAMES = ['admin', 'reception_officer', 'station_officer', 'gatekeeper'];

    public function __construct(
        protected OfficerDutyRosterRepository $repository
    ) {}

    public function listRosters(array $filters = []): LengthAwarePaginator
    {
        return $this->repository->all((int) ($filters['per_page'] ?? 15), $filters);
    }

    public function getRoster(int $id): OfficerDutyRoster
    {
        return $this->repository->findById($id);
    }

    public function assignOfficer(array $data): OfficerDutyRoster
    {
        $this->assertAssignableOfficerId((int) $data['officer_id']);

        $weekStart = $this->normalizeWeekStart($data['duty_week_start']);

        if ($this->repository->rosterExistsForWeek($weekStart)) {
            throw new RuntimeException('An officer is already assigned for this week');
        }

        $data['duty_week_start'] = $weekStart;
        $data['duty_week_end'] = Carbon::parse($weekStart)->addDays(6)->format('Y-m-d');
        $data['shift_type'] = OfficerDutyRosterRepository::SHIFT_TYPE_FULL_DAY;
        $data['created_by'] = auth()->id();

        return DB::transaction(function () use ($data) {
            $roster = $this->repository->create($data);
            event(new OfficerDutyAssigned($roster));
            return $roster;
        });
    }

    public function autoAssignNextWeek(): array
    {
        $nextWeekStart = Carbon::now()->startOfWeek()->addWeek();
        $nextWeekEnd = $nextWeekStart->copy()->addDays(6);

        if ($this->repository->rosterExistsForWeek($nextWeekStart->format('Y-m-d'))) {
            return [
                'success' => false,
                'message' => 'An officer is already assigned for next week',
            ];
        }

        $availableOfficers = $this->repository->getAvailableOfficersForWeek($nextWeekStart->format('Y-m-d'));
        if ($availableOfficers->isEmpty()) {
            return [
                'success' => false,
                'message' => 'No available eligible officers for next week',
            ];
        }

        $officer = $availableOfficers->first();

        $roster = $this->repository->create([
            'officer_id' => $officer->id,
            'duty_week_start' => $nextWeekStart->format('Y-m-d'),
            'duty_week_end' => $nextWeekEnd->format('Y-m-d'),
            'shift_type' => OfficerDutyRosterRepository::SHIFT_TYPE_FULL_DAY,
            'is_active' => true,
            'created_by' => auth()->id(),
        ]);

        event(new OfficerDutyAssigned($roster));

        return [
            'success' => true,
            'officer' => $officer,
            'roster' => $roster,
        ];
    }

    public function updateRoster(int $id, array $data): OfficerDutyRoster
    {
        $roster = $this->repository->findById($id);
        $oldData = $roster->toArray();

        if (isset($data['duty_week_start'])) {
            $weekStart = $this->normalizeWeekStart($data['duty_week_start']);
            $data['duty_week_start'] = $weekStart;
            $data['duty_week_end'] = Carbon::parse($weekStart)->addDays(6)->format('Y-m-d');
        }

        if (isset($data['duty_week_start']) && $this->repository->rosterExistsForWeek($data['duty_week_start'], $id)) {
            throw new RuntimeException('An officer is already assigned for this week');
        }

        $data['shift_type'] = OfficerDutyRosterRepository::SHIFT_TYPE_FULL_DAY;
        $updated = $this->repository->update($id, $data);
        event(new OfficerDutyModified($updated, $oldData));
        return $updated;
    }

    public function deactivateRoster(int $id): OfficerDutyRoster
    {
        return $this->updateRoster($id, ['is_active' => false]);
    }

    public function deleteRoster(int $id): bool
    {
        return $this->repository->delete($id);
    }

    public function getCurrentDutyOfficer(): ?OfficerDutyRoster
    {
        return $this->repository->getCurrentDutyOfficer();
    }

    public function getWeeklySummary(?string $weekStart = null): array
    {
        if ($weekStart) {
            $weekStart = $this->normalizeWeekStart($weekStart);
        } else {
            // Prefer using the actual current roster if one exists (avoids week-start mismatch).
            $current = $this->repository->getCurrentDutyOfficer();
            $weekStart = $current?->duty_week_start?->format('Y-m-d')
                ?? Carbon::now()->startOfWeek()->format('Y-m-d');
        }

        $rosters = $this->repository->getOfficersForWeek($weekStart);
        $roster = $rosters->first();

        return [
            'week_start' => $weekStart,
            'week_end' => Carbon::parse($weekStart)->addDays(6)->format('Y-m-d'),
            'assignment' => $roster ? [
                'officer_id' => $roster->officer_id,
                'officer_name' => $roster->officer?->name,
                'roster_id' => $roster->id,
            ] : null,
        ];
    }

    private function assertAssignableOfficerId(int $officerId): void
    {
        $user = User::query()->with('role')->findOrFail($officerId);
        // "users" may contain a legacy string "role" column; use accessor to avoid collisions.
        $roleName = $user->role_name;
        if ($roleName && in_array($roleName, self::EXCLUDED_ROLE_NAMES, true)) {
            throw new RuntimeException('This user cannot be assigned as officer on duty.');
        }
    }

    private function normalizeWeekStart(string $date): string
    {
        // Always store duty_week_start as the start of week (Monday) for consistent summaries/uniqueness.
        return Carbon::parse($date)->startOfWeek(Carbon::MONDAY)->format('Y-m-d');
    }
}
