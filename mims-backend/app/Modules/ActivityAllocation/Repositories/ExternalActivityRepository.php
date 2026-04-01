<?php

namespace App\Modules\ActivityAllocation\Repositories;

use App\Modules\ActivityAllocation\Models\ExternalActivityDetail;

class ExternalActivityRepository
{
    public function create(array $data): ExternalActivityDetail
    {
        return ExternalActivityDetail::query()->create($data);
    }

    public function update(int $activityId, array $data): ExternalActivityDetail
    {
        return ExternalActivityDetail::query()->updateOrCreate(
            ['activity_id' => $activityId],
            $data
        );
    }

    public function findByActivityId(int $activityId): ?ExternalActivityDetail
    {
        return ExternalActivityDetail::query()->where('activity_id', $activityId)->first();
    }

    public function delete(int $activityId): int
    {
        return ExternalActivityDetail::query()->where('activity_id', $activityId)->delete();
    }
}

