<?php

namespace App\Modules\Release\Services;

use App\Modules\Admissions\Models\Admission;
use App\Modules\Release\Events\SentenceAdjusted;
use App\Modules\Release\Models\SentenceAdjustment;
use App\Modules\Release\Repositories\SentenceAdjustmentRepository;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class SentenceAdjustmentService
{
    public function __construct(
        protected SentenceAdjustmentRepository $repository
    ) {}

    public function listAdjustments(int $admissionId)
    {
        Admission::query()->findOrFail($admissionId);

        return $this->repository->getByAdmission($admissionId);
    }

    /**
     * @return array{adjustment: SentenceAdjustment, new_projected_release_date: string|null, total_adjustment_days: int}
     */
    public function applyAdjustment(
        int $admissionId,
        string $type,
        int $days,
        string $effectiveDate,
        ?string $reason,
        int $approvedBy,
        ?string $ipAddress = null,
    ): array {
        $admission = Admission::query()->with('inmate')->findOrFail($admissionId);

        if (!$admission->is_current || $admission->released_at !== null) {
            throw new RuntimeException('Sentence adjustments can only be applied to current unreleased admissions.');
        }

        if ($admission->original_release_date === null && $admission->projected_release_date === null) {
            throw new RuntimeException('This admission does not have a release date to adjust.');
        }

        $adjustment = DB::transaction(function () use ($admissionId, $type, $days, $effectiveDate, $reason, $approvedBy) {
            return $this->repository->create([
                'admission_id' => $admissionId,
                'adjustment_type' => $type,
                'adjustment_days' => $days,
                'effective_date' => $effectiveDate,
                'reason' => $reason,
                'approved_by' => $approvedBy,
            ]);
        });

        $updatedAdmission = Admission::query()->findOrFail($admissionId);
        $totalAdjustmentDays = $this->repository->getTotalRemissionDays($admissionId);

        event(new SentenceAdjusted(
            $adjustment->load('approver:id,name'),
            $approvedBy,
            $ipAddress,
            [
                'new_projected_release_date' => $updatedAdmission->projected_release_date?->toDateString(),
                'total_adjustment_days' => $totalAdjustmentDays,
            ],
        ));

        return [
            'adjustment' => $adjustment->load('approver:id,name'),
            'new_projected_release_date' => $updatedAdmission->projected_release_date?->toDateString(),
            'total_adjustment_days' => $totalAdjustmentDays,
        ];
    }

    public function deleteAdjustment(int $adjustmentId): void
    {
        $adjustment = $this->repository->findById($adjustmentId);
        $this->repository->delete($adjustment);
    }
}
