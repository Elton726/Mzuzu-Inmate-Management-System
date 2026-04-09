<?php

namespace App\Modules\Admissions\Services;

use App\Modules\Admissions\Models\Activity;
use App\Modules\Admissions\Models\InmateActivity;

class ActivityAssignmentService
{
    /**
     * @param  array<string, mixed>  $context
     */
    public function autoAssign(int $inmateId, int $admissionId, int $assignedByUserId, array $context = []): ?InmateActivity
    {
        $activities = Activity::query()
            ->where('is_active', true)
            ->where('activity_type', 'internal')
            ->where('source_type', 'predefined')
            ->orderBy('name')
            ->get();

        foreach ($activities as $activity) {
            $criteria = $activity->eligibility_criteria ?? [];
            if ($this->meetsCriteria($context, $criteria)) {
                return InmateActivity::create([
                    'inmate_id' => $inmateId,
                    'admission_id' => $admissionId,
                    'activity_id' => $activity->id,
                    'assigned_date' => now()->toDateString(),
                    'assigned_by' => $assignedByUserId,
                ]);
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $context
     * @param  array<string, mixed>  $criteria
     */
    private function meetsCriteria(array $context, array $criteria): bool
    {
        if (isset($criteria['allowed_inmate_types']) && isset($context['inmate_type'])) {
            if (!in_array($context['inmate_type'], (array) $criteria['allowed_inmate_types'], true)) {
                return false;
            }
        }

        if (isset($criteria['min_sentence_years']) && isset($context['sentence_years'])) {
            if ((int) $context['sentence_years'] < (int) $criteria['min_sentence_years']) {
                return false;
            }
        }

        return true;
    }
}
