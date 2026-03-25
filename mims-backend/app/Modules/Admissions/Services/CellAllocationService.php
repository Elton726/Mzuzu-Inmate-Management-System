<?php

namespace App\Modules\Admissions\Services;

use App\Modules\Admissions\Models\Cell;
use App\Modules\Admissions\Models\CellAllocation;

class CellAllocationService
{
    public function findAvailableCell(string $securityClassification): ?Cell
    {
        return Cell::query()
            ->where('security_classification', $securityClassification)
            ->where('status', 'available')
            ->whereColumn('current_occupancy', '<', 'capacity')
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
}
