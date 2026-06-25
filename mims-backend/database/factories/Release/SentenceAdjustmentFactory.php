<?php

namespace Database\Factories\Release;

use App\Modules\Release\Models\SentenceAdjustment;
use Illuminate\Database\Eloquent\Factories\Factory;

class SentenceAdjustmentFactory extends Factory
{
    protected $model = SentenceAdjustment::class;

    public function definition(): array
    {
        return [
            'admission_id' => null, // Should be set explicitly
            'adjustment_type' => $this->faker->randomElement(['remission', 'pardon', 'reduction', 'good_behaviour']),
            'adjustment_days' => $this->faker->numberBetween(30, 365),
            'effective_date' => $this->faker->dateTime(),
            'reason' => $this->faker->sentence(),
            'approved_by' => \App\Models\User::factory(),
        ];
    }

    public function remission(): static
    {
        return $this->state([
            'adjustment_type' => 'remission',
        ]);
    }

    public function pardon(): static
    {
        return $this->state([
            'adjustment_type' => 'pardon',
        ]);
    }

    public function reduction(): static
    {
        return $this->state([
            'adjustment_type' => 'reduction',
        ]);
    }

    public function goodBehaviour(): static
    {
        return $this->state([
            'adjustment_type' => 'good_behaviour',
        ]);
    }
}
