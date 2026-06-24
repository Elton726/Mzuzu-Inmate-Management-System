<?php

namespace Database\Seeders;

use App\Modules\Admissions\Models\Cell;
use Illuminate\Database\Seeder;

class CellSeeder extends Seeder
{
    public function run(): void
    {
        $targetCellCount = 100;
        $blocks = ['A', 'B', 'C', 'D', 'E'];
        $securityClassifications = ['maximum', 'medium', 'minimum'];
        $sampleCells = [
            ['cell_number' => 'A-101', 'block' => 'A', 'gender' => 'male', 'security_classification' => 'maximum'],
            ['cell_number' => 'B-201', 'block' => 'B', 'gender' => 'male', 'security_classification' => 'medium'],
            ['cell_number' => 'C-301', 'block' => 'C', 'gender' => 'female', 'security_classification' => 'minimum'],
        ];

        foreach ($sampleCells as $cell) {
            $this->seedCell($cell['cell_number'], $cell['block'], $cell['gender'], $cell['security_classification']);
        }

        for ($index = 1; Cell::count() < $targetCellCount; $index++) {
            $block = $blocks[($index - 1) % count($blocks)];
            $this->seedCell(
                sprintf('%s-%03d', $block, $index),
                $block,
                $index % 5 === 0 ? 'female' : 'male',
                $securityClassifications[($index - 1) % count($securityClassifications)],
            );
        }
    }

    private function seedCell(string $cellNumber, string $block, string $gender, string $securityClassification): void
    {
        Cell::firstOrCreate(
            ['cell_number' => $cellNumber],
            [
                'block' => $block,
                'gender' => $gender,
                'security_classification' => $securityClassification,
                'capacity' => $this->capacityFor($securityClassification),
                'current_occupancy' => 0,
                'status' => 'available',
            ],
        );
    }

    private function capacityFor(string $securityClassification): int
    {
        return match ($securityClassification) {
            'maximum' => 4,
            'medium' => 6,
            default => 8,
        };
    }
}
