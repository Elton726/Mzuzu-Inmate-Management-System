<?php

namespace App\Modules\ActivityAllocation\Repositories;

use App\Models\User;
use App\Modules\ActivityAllocation\Models\OfficerDutyRoster;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class OfficerDutyRosterRepository
{
    public const SHIFT_TYPE_FULL_DAY = 'full_day';
    private const EXCLUDED_ROLE_NAMES = ['admin', 'reception_officer', 'station_officer', 'gatekeeper'];

    public function all(int $perPage = 15, array $filters = []): LengthAwarePaginator
    {
        $query = OfficerDutyRoster::query()->with(['officer', 'creator']);

        if (isset($filters['officer_id'])) {
            $query->where('officer_id', $filters['officer_id']);
        }
        if (isset($filters['week_start'])) {
            $query->whereDate('duty_week_start', $filters['week_start']);
        }
        if (array_key_exists('is_active', $filters)) {
            $query->where('is_active', filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN));
        }

        return $query->orderByDesc('duty_week_start')->paginate($perPage);
    }

    public function findById(int $id): OfficerDutyRoster
    {
        return OfficerDutyRoster::query()->with(['officer', 'creator'])->findOrFail($id);
    }

    public function create(array $data): OfficerDutyRoster
    {
        return OfficerDutyRoster::query()->create($data);
    }

    public function update(int $id, array $data): OfficerDutyRoster
    {
        $roster = $this->findById($id);
        $roster->update($data);
        return $roster;
    }

    public function delete(int $id): bool
    {
        $roster = $this->findById($id);
        return (bool) $roster->delete();
    }

    public function getCurrentDutyOfficer(): ?OfficerDutyRoster
    {
        return OfficerDutyRoster::query()
            ->active()
            ->currentWeek()
            ->with('officer')
            ->first();
    }

    public function getOfficersForWeek(string $weekStart): Collection
    {
        $query = OfficerDutyRoster::query()
            ->whereDate('duty_week_start', $weekStart)
            ->where('is_active', true);

        return $query->with('officer')->get();
    }

    public function rosterExistsForWeek(string $weekStart, ?int $ignoreId = null): bool
    {
        $query = OfficerDutyRoster::query()
            ->whereDate('duty_week_start', $weekStart)
            ->where('is_active', true);

        if ($ignoreId) {
            $query->where('id', '!=', $ignoreId);
        }

        return $query->exists();
    }

    public function getAvailableOfficersForWeek(string $weekStart): Collection
    {
        $query = User::query()
            ->where('is_active', true)
            ->whereDoesntHave('role', function ($q) {
                $q->whereIn('name', self::EXCLUDED_ROLE_NAMES);
            })
            ->when(Schema::hasColumn('users', 'role'), function ($q) {
                // Also exclude legacy string role column, if present.
                $q->where(function ($inner) {
                    $inner->whereNull('role')->orWhereNotIn('role', self::EXCLUDED_ROLE_NAMES);
                });
            })
            ->whereNotExists(function ($query) use ($weekStart) {
                $query->select(DB::raw(1))
                    ->from('officer_duty_rosters')
                    ->whereColumn('officer_duty_rosters.officer_id', 'users.id')
                    ->whereDate('officer_duty_rosters.duty_week_start', $weekStart)
                    ->where('is_active', true);
            })
            ->orderBy('id')
            ;

        return $query->get();
    }
}
