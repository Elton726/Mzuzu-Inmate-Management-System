<?php

namespace Tests\Feature\ActivityAllocation\Admin;

use App\Models\Role;
use App\Models\User;
use App\Modules\Admissions\Models\Activity;
use App\Modules\ActivityAllocation\Models\ActivityCategory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ActivityManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_internal_activity(): void
    {
        $adminRole = Role::firstOrCreate(['name' => 'admin'], ['description' => null]);
        $admin = User::factory()->create(['role_id' => $adminRole->id]);
        $categoryId = ActivityCategory::query()->where('name', 'Internal Custom')->value('id');

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/activities/internal', [
            'name' => 'Library',
            'category_id' => $categoryId,
            'eligibility_criteria' => ['allowed_inmate_types' => ['convict']],
            'max_participants' => 12,
            'is_active' => true,
            'security_level' => 'low',
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['name' => 'Library']);

        $this->assertDatabaseHas('activities', ['name' => 'Library', 'activity_type' => 'internal']);
    }

    public function test_admin_can_create_external_activity_with_details(): void
    {
        $adminRole = Role::firstOrCreate(['name' => 'admin'], ['description' => null]);
        $admin = User::factory()->create(['role_id' => $adminRole->id]);
        $categoryId = ActivityCategory::query()->where('name', 'External')->value('id');

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/activities/external', [
            'name' => 'Community Service',
            'category_id' => $categoryId,
            'eligibility_criteria' => ['good_behavior' => true],
            'max_participants' => 5,
            'location' => 'Mzuzu City Center',
            'requires_transport' => true,
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['name' => 'Community Service']);

        $this->assertDatabaseHas('activities', ['name' => 'Community Service', 'activity_type' => 'external']);
        $activityId = Activity::query()->where('name', 'Community Service')->value('id');
        $this->assertDatabaseHas('external_activity_details', ['activity_id' => $activityId, 'location' => 'Mzuzu City Center']);
    }
}
