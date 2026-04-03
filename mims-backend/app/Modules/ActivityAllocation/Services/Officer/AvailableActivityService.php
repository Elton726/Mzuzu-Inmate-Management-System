<?php

namespace App\Modules\ActivityAllocation\Services\Officer;

use App\Modules\ActivityAllocation\Repositories\ActivityManagementRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class AvailableActivityService
{
    public function __construct(protected ActivityManagementRepository $repository) {}

    /**
     * List activities that can be used to create sessions.
     * Officers should only see active activities.
     */
    public function listAvailable(array $filters = []): LengthAwarePaginator
    {
        $perPage = (int) ($filters['per_page'] ?? 100);

        $nextFilters = $filters;
        $nextFilters['is_active'] = true;

        return $this->repository->all($perPage, $nextFilters);
    }
}

