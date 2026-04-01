<?php

namespace App\Modules\ActivityAllocation\Repositories;

use App\Modules\Admissions\Models\Activity;
use App\Modules\ActivityAllocation\Models\ActivityCategory;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use RuntimeException;

class ActivityManagementRepository
{
    public function all(int $perPage = 15, array $filters = []): LengthAwarePaginator
    {
        $query = Activity::query()->with(['category', 'creator', 'externalDetails']);

        if (isset($filters['activity_type'])) {
            $query->where('activity_type', $filters['activity_type']);
        }
        if (isset($filters['source_type'])) {
            $query->where('source_type', $filters['source_type']);
        }
        if (isset($filters['category_id'])) {
            $query->where('category_id', $filters['category_id']);
        }
        if (array_key_exists('is_active', $filters)) {
            $query->where('is_active', filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN));
        }
        if (!empty($filters['search'])) {
            $query->where('name', 'like', '%' . $filters['search'] . '%');
        }

        return $query->orderBy('name')->paginate($perPage);
    }

    public function findById(int $id): Activity
    {
        return Activity::query()->with(['category', 'creator', 'externalDetails'])->findOrFail($id);
    }

    public function create(array $data): Activity
    {
        return Activity::query()->create($data);
    }

    public function update(int $id, array $data): Activity
    {
        $activity = $this->findById($id);
        $activity->update($data);
        return $activity;
    }

    public function delete(int $id): bool
    {
        $activity = $this->findById($id);

        if ($activity->inmateActivities()->whereNull('end_date')->count() > 0) {
            throw new RuntimeException('Cannot delete activity with active inmate assignments');
        }

        return (bool) $activity->delete();
    }

    public function getCategories(): Collection
    {
        return ActivityCategory::query()->orderBy('name')->get();
    }

    public function getPredefinedActivities(): Collection
    {
        return Activity::query()
            ->where('source_type', 'predefined')
            ->where('is_active', true)
            ->orderBy('name')
            ->get();
    }
}

