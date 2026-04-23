<?php

namespace App\Modules\Release\Repositories;

use App\Modules\Release\Models\SentenceAdjustment;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class SentenceAdjustmentRepository
{
    public function create(array $data): SentenceAdjustment
    {
        return SentenceAdjustment::query()->create($data);
    }

    public function getByAdmission(int $admissionId): Collection
    {
        return SentenceAdjustment::query()
            ->with('approver:id,name')
            ->where('admission_id', $admissionId)
            ->orderByDesc('effective_date')
            ->orderByDesc('id')
            ->get();
    }

    public function findById(int $adjustmentId): SentenceAdjustment
    {
        return SentenceAdjustment::query()
            ->with(['admission.inmate', 'approver:id,name'])
            ->findOrFail($adjustmentId);
    }

    public function delete(SentenceAdjustment $adjustment): bool
    {
        return (bool) $adjustment->delete();
    }

    public function getTotalRemissionDays(int $admissionId): int
    {
        return (int) DB::table('sentence_adjustments')
            ->where('admission_id', $admissionId)
            ->sum('adjustment_days');
    }
}
