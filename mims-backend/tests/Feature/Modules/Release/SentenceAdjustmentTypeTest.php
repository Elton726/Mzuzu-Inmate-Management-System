<?php

namespace Tests\Feature\Modules\Release;

use App\Models\Role;
use App\Models\User;
use App\Modules\Release\Models\SentenceAdjustmentType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SentenceAdjustmentTypeTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $stationOfficer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = $this->userWithRole('admin');
        $this->stationOfficer = $this->userWithRole('station_officer');
    }

    private function userWithRole(string $roleName): User
    {
        $role = Role::firstOrCreate(['name' => $roleName], ['description' => null]);

        return User::factory()->create(['role_id' => $role->id]);
    }

    public function test_admin_can_list_sentence_adjustment_types()
    {
        SentenceAdjustmentType::factory()->create([ 'name' => 'remission', 'years_to_reduce' => 1, 'info' => 'Test', 'is_active' => true ]);

        $response = $this->actingAs($this->admin)
            ->getJson('/api/admin/sentence-adjustment-types');

        $response->assertStatus(200);
        $response->assertJsonStructure(['data']);
        $this->assertCount(1, $response->json('data'));
    }

    public function test_station_officer_can_list_available_sentence_adjustment_types()
    {
        SentenceAdjustmentType::factory()->create([ 'name' => 'remission', 'years_to_reduce' => 1, 'info' => 'Test', 'is_active' => true ]);

        $response = $this->actingAs($this->stationOfficer)
            ->getJson('/api/sentence-adjustment-types/available');

        $response->assertStatus(200);
        $response->assertJsonStructure(['data']);
        $this->assertCount(1, $response->json('data'));
    }

    public function test_admin_can_create_sentence_adjustment_type()
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/admin/sentence-adjustment-types', [
                'name' => 'pardon',
                'years_to_reduce' => 2,
                'info' => 'Pardon adjustment',
                'is_active' => true,
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('sentence_adjustment_types', ['name' => 'pardon']);
    }

    public function test_admin_can_update_sentence_adjustment_type()
    {
        $type = SentenceAdjustmentType::factory()->create([ 'name' => 'reduction', 'years_to_reduce' => 1, 'info' => 'Old info', 'is_active' => true ]);

        $response = $this->actingAs($this->admin)
            ->putJson("/api/admin/sentence-adjustment-types/{$type->id}", [
                'name' => 'reduction',
                'years_to_reduce' => 3,
                'info' => 'Updated info',
                'is_active' => false,
            ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('sentence_adjustment_types', [
            'id' => $type->id,
            'years_to_reduce' => 3,
            'info' => 'Updated info',
            'is_active' => false,
        ]);
    }

    public function test_admin_can_delete_sentence_adjustment_type()
    {
        $type = SentenceAdjustmentType::factory()->create([ 'name' => 'reduction', 'years_to_reduce' => 1, 'info' => 'Test', 'is_active' => true ]);

        $response = $this->actingAs($this->admin)
            ->deleteJson("/api/admin/sentence-adjustment-types/{$type->id}");

        $response->assertStatus(204);
        $this->assertDatabaseMissing('sentence_adjustment_types', ['id' => $type->id]);
    }

    public function test_station_officer_cannot_manage_sentence_adjustment_types()
    {
        $response = $this->actingAs($this->stationOfficer)
            ->postJson('/api/admin/sentence-adjustment-types', [
                'name' => 'pardon',
                'years_to_reduce' => 1,
                'info' => 'Test',
                'is_active' => true,
            ]);

        $response->assertStatus(403);
    }
}
