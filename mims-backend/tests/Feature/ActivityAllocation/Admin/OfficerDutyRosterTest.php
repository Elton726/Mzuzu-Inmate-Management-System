<?php

namespace Tests\Feature\ActivityAllocation\Admin;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class OfficerDutyRosterTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_assign_officer_to_duty(): void
    {
        $adminRole = Role::firstOrCreate(['name' => 'admin'], ['description' => null]);
        $officerRole = Role::firstOrCreate(['name' => 'officer_on_duty'], ['description' => null]);

        $admin = User::factory()->create(['role_id' => $adminRole->id]);
        $officer = User::factory()->create([
            'role_id' => $officerRole->id,
            'is_eligible_for_duty' => true,
            'is_active' => true,
        ]);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/duty-rosters', [
            'officer_id' => $officer->id,
            'duty_week_start' => '2026-04-06',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['message', 'data' => ['id', 'officer_id', 'duty_week_start', 'duty_week_end', 'shift_type']]);

        $this->assertTrue(DB::table('officer_duty_rosters')
            ->where('officer_id', $officer->id)
            ->whereDate('duty_week_start', '2026-04-06')
            ->where('shift_type', 'full_day')
            ->exists());
    }

    public function test_cannot_assign_same_week_twice(): void
    {
        $adminRole = Role::firstOrCreate(['name' => 'admin'], ['description' => null]);
        $officerRole = Role::firstOrCreate(['name' => 'officer_on_duty'], ['description' => null]);

        $admin = User::factory()->create(['role_id' => $adminRole->id]);
        $officer1 = User::factory()->create(['role_id' => $officerRole->id, 'is_eligible_for_duty' => true]);
        $officer2 = User::factory()->create(['role_id' => $officerRole->id, 'is_eligible_for_duty' => true]);

        $this->actingAs($admin, 'sanctum')->postJson('/api/admin/duty-rosters', [
            'officer_id' => $officer1->id,
            'duty_week_start' => '2026-04-06',
        ])->assertStatus(201);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/duty-rosters', [
            'officer_id' => $officer2->id,
            'duty_week_start' => '2026-04-06',
        ]);

        $response->assertStatus(422);
    }

    public function test_admin_can_auto_assign_officers(): void
    {
        $adminRole = Role::firstOrCreate(['name' => 'admin'], ['description' => null]);
        $officerRole = Role::firstOrCreate(['name' => 'officer_on_duty'], ['description' => null]);

        $admin = User::factory()->create(['role_id' => $adminRole->id]);
        User::factory()->count(3)->create([
            'role_id' => $officerRole->id,
            'is_eligible_for_duty' => true,
            'is_active' => true,
        ]);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/duty-rosters/auto-assign');

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'assignment' => ['success']]);
    }
}
