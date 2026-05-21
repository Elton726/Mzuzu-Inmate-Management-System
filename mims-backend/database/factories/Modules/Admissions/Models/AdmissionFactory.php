<?php

namespace Database\Factories\Modules\Admissions\Models;

use App\Models\User;
use App\Modules\Admissions\Models\Admission;
use App\Modules\Admissions\Models\Inmate;
use Illuminate\Database\Eloquent\Factories\Factory;

class AdmissionFactory extends Factory
{
    protected $model = Admission::class;

    public function definition(): array
    {
        $sentenceStart = now()->subMonths(6);
        $releaseDate = now()->addMonths(6);

        return [
            'inmate_id' => Inmate::factory(),
            'admission_date' => $sentenceStart->format('Y-m-d'),
            'admission_type' => 'first_time',
            'inmate_type' => 'convict',
            'case_number' => strtoupper($this->faker->unique()->bothify('CASE-####??')),
            'court_name' => $this->faker->company().' Court',
            'offence_description' => $this->faker->sentence(),
            'sentence_years' => 1,
            'sentence_months' => 0,
            'sentence_start_date' => $sentenceStart->format('Y-m-d'),
            'projected_release_date' => $releaseDate->format('Y-m-d'),
            'original_release_date' => $releaseDate->format('Y-m-d'),
            'remand_next_court_date' => null,
            'committal_warrant_path' => null,
            'remand_warrant_path' => null,
            'admitted_by' => User::factory(),
            'is_current' => true,
            'released_at' => null,
            'release_reason' => null,
        ];
    }
}
