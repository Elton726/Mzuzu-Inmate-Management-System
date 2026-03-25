<?php

namespace Tests\Feature\Admin;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_list_all_users()
    {
        $adminRole = Role::firstOrCreate(['name' => 'admin'], ['description' => null]);
        $admin = User::factory()->create(['role_id' => $adminRole->id]);
        User::factory(5)->create();

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/users');

        $response->assertStatus(200)
                 ->assertJsonStructure(['data']);
    }

    public function test_non_admin_cannot_list_users()
    {
        $role = Role::firstOrCreate(['name' => 'reception_officer'], ['description' => null]);
        $user = User::factory()->create(['role_id' => $role->id]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/admin/users');

        $response->assertStatus(403);
    }

    public function test_admin_can_search_users()
    {
        $adminRole = Role::firstOrCreate(['name' => 'admin'], ['description' => null]);
        $admin = User::factory()->create(['role_id' => $adminRole->id]);
        User::factory()->create(['name' => 'John Doe', 'email' => 'john@example.com']);
        User::factory()->create(['name' => 'Jane Smith', 'email' => 'jane@example.com']);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/users?search=John');

        $response->assertStatus(200)
                 ->assertJsonFragment(['name' => 'John Doe']);
    }

    public function test_admin_can_filter_users_by_role()
    {
        $adminRole = Role::firstOrCreate(['name' => 'admin'], ['description' => null]);
        $admin = User::factory()->create(['role_id' => $adminRole->id]);
        $reception = Role::firstOrCreate(['name' => 'reception_officer'], ['description' => null]);
        $station = Role::firstOrCreate(['name' => 'station_officer'], ['description' => null]);
        User::factory(3)->create(['role_id' => $reception->id]);
        User::factory(2)->create(['role_id' => $station->id]);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/users?role=reception_officer');

        $response->assertStatus(200);
    }

    public function test_admin_can_create_user()
    {
        $adminRole = Role::firstOrCreate(['name' => 'admin'], ['description' => null]);
        $admin = User::factory()->create(['role_id' => $adminRole->id]);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/users', [
            'name' => 'New User',
            'email' => 'newuser@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'role' => 'reception_officer',
        ]);

        $response->assertStatus(201)
                 ->assertJsonFragment(['name' => 'New User']);
        $this->assertDatabaseHas('users', ['email' => 'newuser@example.com']);
    }

    public function test_admin_can_view_user_details()
    {
        $adminRole = Role::firstOrCreate(['name' => 'admin'], ['description' => null]);
        $admin = User::factory()->create(['role_id' => $adminRole->id]);
        $user = User::factory()->create();

        $response = $this->actingAs($admin, 'sanctum')->getJson("/api/admin/users/{$user->id}");

        $response->assertStatus(200)
                 ->assertJson(['id' => $user->id]);
    }

    public function test_admin_can_update_user()
    {
        $adminRole = Role::firstOrCreate(['name' => 'admin'], ['description' => null]);
        $admin = User::factory()->create(['role_id' => $adminRole->id]);
        $reception = Role::firstOrCreate(['name' => 'reception_officer'], ['description' => null]);
        $user = User::factory()->create(['role_id' => $reception->id]);

        $response = $this->actingAs($admin, 'sanctum')->putJson("/api/admin/users/{$user->id}", [
            'name' => 'Updated Name',
            'role' => 'station_officer',
        ]);

        $response->assertStatus(200);
        $user->refresh();
        $this->assertEquals('Updated Name', $user->name);
        $this->assertEquals('station_officer', $user->role_name);
    }

    public function test_admin_can_delete_user()
    {
        $adminRole = Role::firstOrCreate(['name' => 'admin'], ['description' => null]);
        $admin = User::factory()->create(['role_id' => $adminRole->id]);
        $user = User::factory()->create();

        $response = $this->actingAs($admin, 'sanctum')->deleteJson("/api/admin/users/{$user->id}");

        $response->assertStatus(204);
        $this->assertDatabaseMissing('users', ['id' => $user->id]);
    }

    public function test_admin_cannot_delete_self()
    {
        $adminRole = Role::firstOrCreate(['name' => 'admin'], ['description' => null]);
        $admin = User::factory()->create(['role_id' => $adminRole->id]);

        $response = $this->actingAs($admin, 'sanctum')->deleteJson("/api/admin/users/{$admin->id}");

        $response->assertStatus(400)
                 ->assertJsonFragment(['message' => 'You cannot delete your own account.']);
    }

    public function test_admin_can_get_statistics()
    {
        $adminRole = Role::firstOrCreate(['name' => 'admin'], ['description' => null]);
        $admin = User::factory()->create(['role_id' => $adminRole->id]);
        $reception = Role::firstOrCreate(['name' => 'reception_officer'], ['description' => null]);
        $station = Role::firstOrCreate(['name' => 'station_officer'], ['description' => null]);
        User::factory(5)->create(['role_id' => $reception->id]);
        User::factory(3)->create(['role_id' => $station->id]);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/users/statistics');

        $response->assertStatus(200)
                 ->assertJsonStructure(['total_users', 'by_role', 'recent_users']);
    }

    public function test_admin_can_bulk_delete_users()
    {
        $adminRole = Role::firstOrCreate(['name' => 'admin'], ['description' => null]);
        $admin = User::factory()->create(['role_id' => $adminRole->id]);
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/users/bulk-delete', [
            'user_ids' => [$user1->id, $user2->id],
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseMissing('users', ['id' => $user1->id]);
        $this->assertDatabaseMissing('users', ['id' => $user2->id]);
    }

    public function test_admin_cannot_bulk_delete_including_self()
    {
        $adminRole = Role::firstOrCreate(['name' => 'admin'], ['description' => null]);
        $admin = User::factory()->create(['role_id' => $adminRole->id]);
        $user = User::factory()->create();

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/users/bulk-delete', [
            'user_ids' => [$admin->id, $user->id],
        ]);

        $response->assertStatus(400)
                 ->assertJsonFragment(['message' => 'You cannot delete your own account.']);
    }

    public function test_admin_can_bulk_update_role()
    {
        $adminRole = Role::firstOrCreate(['name' => 'admin'], ['description' => null]);
        $admin = User::factory()->create(['role_id' => $adminRole->id]);
        $reception = Role::firstOrCreate(['name' => 'reception_officer'], ['description' => null]);
        $user1 = User::factory()->create(['role_id' => $reception->id]);
        $user2 = User::factory()->create(['role_id' => $reception->id]);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/users/bulk-update-role', [
            'user_ids' => [$user1->id, $user2->id],
            'role' => 'station_officer',
        ]);

        $response->assertStatus(200);
        $user1->refresh();
        $user2->refresh();
        $this->assertEquals('station_officer', $user1->role_name);
        $this->assertEquals('station_officer', $user2->role_name);
    }

    public function test_admin_cannot_bulk_update_including_self()
    {
        $adminRole = Role::firstOrCreate(['name' => 'admin'], ['description' => null]);
        $admin = User::factory()->create(['role_id' => $adminRole->id]);
        $user = User::factory()->create();

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/users/bulk-update-role', [
            'user_ids' => [$admin->id, $user->id],
            'role' => 'station_officer',
        ]);

        $response->assertStatus(400)
                 ->assertJsonFragment(['message' => 'You cannot change your own role.']);
    }
}
