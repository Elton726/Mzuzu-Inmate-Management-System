<?php

namespace Database\Seeders;

use App\Modules\Admissions\Models\Activity;
use App\Modules\Admissions\Models\Cell;
use Illuminate\Database\Seeder;

class AdmissionModuleSeeder extends Seeder
{
    public function run(): void
    {
        Cell::firstOrCreate(
            ['cell_number' => 'A-101'],
            ['block' => 'A', 'security_classification' => 'maximum', 'capacity' => 4, 'status' => 'available'],
        );
        Cell::firstOrCreate(
            ['cell_number' => 'B-201'],
            ['block' => 'B', 'security_classification' => 'medium', 'capacity' => 6, 'status' => 'available'],
        );
        Cell::firstOrCreate(
            ['cell_number' => 'C-301'],
            ['block' => 'C', 'security_classification' => 'minimum', 'capacity' => 8, 'status' => 'available'],
        );

        Activity::firstOrCreate(
            ['name' => 'Kitchen'],
            [
                'activity_type' => 'internal',
                'eligibility_criteria' => ['min_sentence_years' => 0, 'allowed_inmate_types' => ['convict']],
                'is_active' => true,
            ],
        );
        Activity::firstOrCreate(
            ['name' => 'Tailoring'],
            [
                'activity_type' => 'internal',
                'eligibility_criteria' => ['min_sentence_years' => 1, 'allowed_inmate_types' => ['convict']],
                'is_active' => true,
            ],
        );
        Activity::firstOrCreate(
            ['name' => 'Farm Work'],
            [
                'activity_type' => 'external',
                'eligibility_criteria' => ['min_sentence_years' => 0, 'allowed_inmate_types' => ['convict']],
                'max_participants' => 20,
                'is_active' => true,
            ],
        );
    }
}
