<?php

namespace Tests\Feature\Admin;

use App\Models\Role;
use App\Models\User;
use App\Models\ActivityLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ActivityLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_action_is_logged_by_middleware()
    {
        $adminRole = Role::firstOrCreate(['name' => 'admin'], ['description' => null]);
        $admin = User::factory()->create(['role_id' => $adminRole->id, 'name' => 'John Admin']);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/users', [
            'name' => 'New User',
            'email' => 'newuser@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'role' => 'gatekeeper',
        ]);

        $response->assertStatus(201);

        // Verify that the activity logger middleware created a log entry
        $this->assertDatabaseHas('activity_logs', [
            'user_id' => $admin->id,
            'user_name' => 'John Admin',
            'user_role' => 'Administrator',
            'action' => 'created a new user',
        ]);
    }

    public function test_admin_can_view_activity_logs()
    {
        $adminRole = Role::firstOrCreate(['name' => 'admin'], ['description' => null]);
        $admin = User::factory()->create(['role_id' => $adminRole->id]);

        ActivityLog::create([
            'user_id' => $admin->id,
            'user_name' => 'Test User',
            'user_role' => 'Administrator',
            'action' => 'created a cell',
            'ip_address' => '127.0.0.1',
        ]);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/activity-logs');

        $response->assertStatus(200)
                 ->assertJsonFragment([
                     'user_name' => 'Test User',
                     'action' => 'created a cell',
                 ]);
    }

    public function test_non_admin_cannot_view_activity_logs()
    {
        $role = Role::firstOrCreate(['name' => 'gatekeeper'], ['description' => null]);
        $user = User::factory()->create(['role_id' => $role->id]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/activity-logs');

        $response->assertStatus(403);
    }
}
