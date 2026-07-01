<?php

namespace Database\Factories\Release;

use App\Modules\Release\Models\SentenceAdjustmentType;
use Illuminate\Database\Eloquent\Factories\Factory;

class SentenceAdjustmentTypeFactory extends Factory
{
    protected $model = SentenceAdjustmentType::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->unique()->word(),
            'years_to_reduce' => $this->faker->numberBetween(0, 10),
            'info' => $this->faker->sentence(),
            'is_active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state([
            'is_active' => false,
        ]);
    }
}
