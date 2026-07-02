<?php

namespace App\Modules\ActivityAllocation\Services\Admin;

use App\Modules\ActivityAllocation\Events\ActivityCreated;
use App\Modules\ActivityAllocation\Events\ActivityUpdated;
use App\Modules\ActivityAllocation\Models\ActivityCategory;
use App\Modules\ActivityAllocation\Repositories\ActivityManagementRepository;
use App\Modules\ActivityAllocation\Repositories\ExternalActivityRepository;
use App\Modules\Admissions\Models\Activity;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ActivityManagementService
{
    public function __construct(
        protected ActivityManagementRepository $repository,
        protected ExternalActivityRepository $externalRepository
    ) {}

    public function listActivities(array $filters = []): LengthAwarePaginator
    {
        return $this->repository->all((int) ($filters['per_page'] ?? 15), $filters);
    }

    public function searchActivitySuggestions(string $term): array
    {
        return $this->repository->searchSuggestions($term);
    }

    public function getActivity(int $id): Activity
    {
        return $this->repository->findById($id);
    }

    public function createInternalActivity(array $data): Activity
    {
        $data['activity_type'] = 'internal';

        $categoryId = $data['category_id'] ?? $this->getInternalCategoryId('custom');
        $categoryName = $this->getCategoryNameById($categoryId);
        if ($categoryName === 'External') {
            throw new RuntimeException('Internal activities cannot use the External category');
        }

        $data['category_id'] = $categoryId;
        $data['source_type'] = $this->getSourceTypeForCategoryName($categoryName) ?? 'custom';
        if ($data['source_type'] === 'predefined') {
            $data['max_participants'] = null;
        }
        $data['created_by'] = auth()->id();
        $data['eligibility_criteria'] = $this->normalizeEligibilityCriteria($data['eligibility_criteria'] ?? null);

        $activity = $this->repository->create($data);
        event(new ActivityCreated($activity));

        return $activity->load(['category', 'creator', 'externalDetails']);
    }

    public function createExternalActivity(array $activityData, array $externalData): Activity
    {
        $activityData['activity_type'] = 'external';
        $activityData['source_type'] = 'custom';
        $activityData['category_id'] = $this->getExternalCategoryId() ?? ($activityData['category_id'] ?? null);
        $activityData['created_by'] = auth()->id();
        $activityData['eligibility_criteria'] = $this->normalizeEligibilityCriteria($activityData['eligibility_criteria'] ?? null);

        return DB::transaction(function () use ($activityData, $externalData) {
            $activity = $this->repository->create($activityData);
            $this->externalRepository->create(array_merge($externalData, ['activity_id' => $activity->id]));

            event(new ActivityCreated($activity));

            return $activity->load(['category', 'creator', 'externalDetails']);
        });
    }

    public function updateActivity(int $id, array $data): Activity
    {
        $activity = $this->repository->findById($id);
        $oldData = $activity->toArray();

        $nextCategoryId = $data['category_id'] ?? $activity->category_id;
        $nextCategoryName = $this->getCategoryNameById($nextCategoryId);
        $nextActivityType = $this->getActivityTypeForCategoryName($nextCategoryName) ?? $activity->activity_type;

        if ($nextActivityType === 'external') {
            $data['activity_type'] = 'external';
            $data['source_type'] = 'custom';
            $data['category_id'] = $this->getExternalCategoryId() ?? $nextCategoryId;
        } else {
            $data['activity_type'] = 'internal';
            $data['category_id'] = $nextCategoryId;
            $data['source_type'] = $this->getSourceTypeForCategoryName($nextCategoryName) ?? ($activity->source_type ?? 'custom');
            if ($data['source_type'] === 'predefined') {
                $data['max_participants'] = null;
            }

            if ($activity->activity_type === 'external') {
                // If switching from external -> internal, remove external details.
                $this->externalRepository->delete($activity->id);
            }
        }

        if (array_key_exists('eligibility_criteria', $data)) {
            $data['eligibility_criteria'] = $this->normalizeEligibilityCriteria($data['eligibility_criteria']);
        } else {
            // Always enforce convict-only eligibility
            $data['eligibility_criteria'] = $this->normalizeEligibilityCriteria($activity->eligibility_criteria);
        }

        $data['modified_by'] = auth()->id();

        $updated = $this->repository->update($id, $data);
        event(new ActivityUpdated($updated, $oldData));

        return $updated->load(['category', 'creator', 'externalDetails']);
    }

    public function updateExternalActivity(int $id, array $externalData): Activity
    {
        $activity = $this->repository->findById($id);
        if ($activity->activity_type !== 'external') {
            throw new RuntimeException('Activity is not an external activity');
        }

        $this->externalRepository->update($id, $externalData);
        return $activity->refresh()->load(['category', 'creator', 'externalDetails']);
    }

    public function deactivateActivity(int $id): Activity
    {
        return $this->updateActivity($id, ['is_active' => false]);
    }

    public function activateActivity(int $id): Activity
    {
        return $this->updateActivity($id, ['is_active' => true]);
    }

    public function deleteActivity(int $id): bool
    {
        $activity = $this->repository->findById($id);

        if ($activity->activity_type === 'external') {
            $this->externalRepository->delete($id);
        }

        return $this->repository->delete($id);
    }

    public function getCategories()
    {
        return $this->repository->getCategories();
    }

    public function getPredefinedActivities()
    {
        return $this->repository->getPredefinedActivities();
    }

    private function normalizeEligibilityCriteria(mixed $criteria): array
    {
        $next = is_array($criteria) ? $criteria : [];
        $next['allowed_inmate_types'] = ['convict'];
        unset($next['good_behavior'], $next['education_level']);
        return $next;
    }

    private function getExternalCategoryId(): ?int
    {
        return ActivityCategory::query()->where('name', 'External')->value('id');
    }

    private function getInternalCategoryId(string $sourceType): ?int
    {
        $name = $sourceType === 'predefined' ? 'Internal Predefined' : 'Internal Custom';
        return ActivityCategory::query()->where('name', $name)->value('id');
    }

    private function getCategoryNameById(?int $categoryId): ?string
    {
        if (!$categoryId) return null;
        return ActivityCategory::query()->where('id', $categoryId)->value('name');
    }

    private function getActivityTypeForCategoryName(?string $categoryName): ?string
    {
        if (!$categoryName) return null;
        return $categoryName === 'External' ? 'external' : 'internal';
    }

    private function getSourceTypeForCategoryName(?string $categoryName): ?string
    {
        return match ($categoryName) {
            'Internal Predefined' => 'predefined',
            'Internal Custom' => 'custom',
            'External' => 'custom',
            default => null,
        };
    }
}
