<?php

namespace Database\Factories\Modules\Admissions\Models;

use App\Modules\Admissions\Models\Inmate;
use Illuminate\Database\Eloquent\Factories\Factory;

class InmateFactory extends Factory
{
    protected $model = Inmate::class;

    public function definition(): array
    {
        return [
            'prison_number' => strtoupper($this->faker->unique()->bothify('MZ######')),
            'first_name' => $this->faker->firstName(),
            'last_name' => $this->faker->lastName(),
            'other_names' => null,
            'date_of_birth' => $this->faker->dateTimeBetween('-60 years', '-18 years')->format('Y-m-d'),
            'is_young_offender' => false,
            'place_of_birth' => $this->faker->city(),
            'nationality' => 'Malawian',
            'national_id' => $this->faker->unique()->bothify('MW########'),
            'marital_status' => $this->faker->randomElement(['single', 'married', 'divorced', 'widowed']),
            'next_of_kin_name' => $this->faker->name(),
            'next_of_kin_contact' => $this->faker->phoneNumber(),
            'personal_belongings' => null,
            'photo_path' => null,
            'status' => 'active',
            'last_release_date' => null,
        ];
    }
}
