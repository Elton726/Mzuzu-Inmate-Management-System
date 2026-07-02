<?php

namespace App\Modules\Admissions\Services;

use App\Modules\Admissions\Models\Cell;
use App\Modules\Admissions\Models\CellAllocation;

class CellAllocationService
{
    public function findAvailableCell(string $securityClassification, ?string $gender = null): ?Cell
    {
        $securityLevels = $this->compatibleSecurityLevels($securityClassification);

        $query = Cell::query()
            ->whereIn('security_classification', $securityLevels)
            ->where('status', 'available')
            ->whereColumn('current_occupancy', '<', 'capacity');

        if (in_array($gender, ['male', 'female'], true)) {
            $query->where('gender', $gender);
        }

        return $query->orderByRaw(
                "CASE security_classification WHEN ? THEN 0 WHEN 'minimum' THEN 1 WHEN 'medium' THEN 2 WHEN 'maximum' THEN 3 ELSE 4 END",
                [$securityClassification]
            )
            ->orderBy('current_occupancy')
            ->orderBy('id')
            ->first();
    }

    public function allocate(int $inmateId, int $admissionId, int $cellId, ?string $reason = null): CellAllocation
    {
        $allocation = CellAllocation::create([
            'inmate_id' => $inmateId,
            'admission_id' => $admissionId,
            'cell_id' => $cellId,
            'allocated_date' => now()->toDateString(),
            'reason' => $reason,
        ]);

        $cell = Cell::lockForUpdate()->findOrFail($cellId);
        $cell->current_occupancy = $cell->current_occupancy + 1;
        if ($cell->current_occupancy >= $cell->capacity) {
            $cell->status = 'full';
        }
        $cell->save();

        return $allocation;
    }

    /**
     * Allocation may place an inmate in the requested level or a stricter level
     * when the exact tier is unavailable. It never downgrades security.
     *
     * Security tier order (least → most strict): minimum < low < medium < high < maximum
     *
     * @return array<int, string>
     */
    private function compatibleSecurityLevels(string $securityClassification): array
    {
        return match ($securityClassification) {
            'minimum', 'low' => ['minimum', 'low', 'medium', 'high', 'maximum'],
            'medium'         => ['medium', 'high', 'maximum'],
            'high'           => ['high', 'maximum'],
            'maximum'        => ['maximum'],
            default          => ['medium', 'high', 'maximum'],
        };
    }
}
