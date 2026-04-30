<?php

namespace Database\Factories\Release;

use App\Modules\Release\Models\ReleaseWorkflow;
use Illuminate\Database\Eloquent\Factories\Factory;

class ReleaseWorkflowFactory extends Factory
{
    protected $model = ReleaseWorkflow::class;

    public function definition(): array
    {
        return [
            'admission_id' => null, // Should be set explicitly
            'approved_by' => \App\Models\User::factory(),
            'approved_at' => now(),
            'approval_notes' => $this->faker->sentence(),
            'confirmed_by' => null,
            'confirmed_at' => null,
            'confirmation_notes' => null,
            'cancelled_by' => null,
            'cancelled_at' => null,
            'cancellation_reason' => null,
            'status' => 'pending_approval',
        ];
    }

    public function approved(): static
    {
        return $this->state([
            'status' => 'approved',
            'approved_by' => \App\Models\User::factory(),
            'approved_at' => now(),
        ]);
    }

    public function confirmed(): static
    {
        return $this->state([
            'status' => 'confirmed',
            'approved_by' => \App\Models\User::factory(),
            'approved_at' => now(),
            'confirmed_by' => \App\Models\User::factory(),
            'confirmed_at' => now(),
        ]);
    }

    public function cancelled(): static
    {
        return $this->state([
            'status' => 'cancelled',
            'cancelled_by' => \App\Models\User::factory(),
            'cancelled_at' => now(),
            'cancellation_reason' => $this->faker->sentence(),
        ]);
    }
}
