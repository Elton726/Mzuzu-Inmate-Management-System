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
        $query = Activity::query()
            ->select('activities.*')
            ->selectRaw("
                CASE
                    WHEN LOWER(activities.name) = 'farm work' OR activities.activity_type = 'external' THEN 'External'
                    WHEN activities.source_type = 'custom' THEN 'Internal Custom'
                    ELSE 'Internal Predefined'
                END AS category
            ")
            ->with(['creator', 'externalDetails']);

        if (isset($filters['activity_type'])) {
            $query->where('activities.activity_type', $filters['activity_type']);
        }
        if (isset($filters['source_type'])) {
            $query->where('activities.source_type', $filters['source_type']);
        }
        if (isset($filters['category_id'])) {
            $query->where('activities.category_id', $filters['category_id']);
        }
        if (array_key_exists('is_active', $filters)) {
            $query->where('activities.is_active', filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN));
        }
        if (!empty($filters['search'])) {
            $query->where('activities.name', 'like', '%' . $filters['search'] . '%');
        }
        if (!empty($filters['category'])) {
            $query->whereRaw("
                CASE
                    WHEN LOWER(activities.name) = 'farm work' OR activities.activity_type = 'external' THEN 'External'
                    WHEN activities.source_type = 'custom' THEN 'Internal Custom'
                    ELSE 'Internal Predefined'
                END = ?
            ", [$filters['category']]);
        }

        return $query->orderBy('activities.name')->paginate($perPage);
    }

    public function searchSuggestions(string $term, int $limit = 8): array
    {
        $normalized = mb_strtolower(trim($term));
        if ($normalized === '') {
            return [];
        }

        $activities = Activity::query()
            ->with('category:id,name')
            ->where(function ($query) use ($normalized) {
                $query->whereRaw('LOWER(activities.name) LIKE ?', ["%{$normalized}%"])
                    ->orWhereHas('category', function ($categoryQuery) use ($normalized) {
                        $categoryQuery->whereRaw('LOWER(name) LIKE ?', ["%{$normalized}%"]);
                    })
                    ->orWhereRaw("
                        LOWER(
                            CASE
                                WHEN LOWER(activities.name) = 'farm work' OR activities.activity_type = 'external' THEN 'External'
                                WHEN activities.source_type = 'custom' THEN 'Internal Custom'
                                ELSE 'Internal Predefined'
                            END
                        ) LIKE ?
                    ", ["%{$normalized}%"]);

                if (str_contains('active', $normalized)) {
                    $query->orWhere('is_active', true);
                }
                if (str_contains('inactive', $normalized)) {
                    $query->orWhere('is_active', false);
                }
            })
            ->orderBy('name')
            ->limit(25)
            ->get();

        $suggestions = [];
        $seen = [];

        foreach ($activities as $activity) {
            $this->addSuggestion($suggestions, $seen, $activity->name, 'Name', $normalized, [
                'search' => $activity->name,
            ]);

            $businessCategory = $this->businessCategoryFor($activity);
            $this->addSuggestion($suggestions, $seen, $businessCategory, 'Category', $normalized, [
                'category' => $businessCategory,
            ]);

            $this->addSuggestion($suggestions, $seen, $activity->is_active ? 'Active' : 'Inactive', 'Status', $normalized, [
                'is_active' => $activity->is_active ? 'true' : 'false',
            ]);

            if (count($suggestions) >= $limit) {
                break;
            }
        }

        return array_slice($suggestions, 0, $limit);
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

    private function addSuggestion(array &$suggestions, array &$seen, string $value, string $type, string $term, array $filters): void
    {
        if (!str_contains(mb_strtolower($value), $term)) {
            return;
        }

        $key = "{$type}:{$value}";
        if (isset($seen[$key])) {
            return;
        }

        $seen[$key] = true;
        $suggestions[] = [
            'value' => $value,
            'label' => $value,
            'type' => $type,
            'filters' => $filters,
        ];
    }

    private function businessCategoryFor(Activity $activity): string
    {
        if (mb_strtolower($activity->name) === 'farm work' || $activity->activity_type === 'external') {
            return 'External';
        }

        return $activity->source_type === 'custom' ? 'Internal Custom' : 'Internal Predefined';
    }
}
