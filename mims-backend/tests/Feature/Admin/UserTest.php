<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_list_all_users()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        User::factory(5)->create();

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/users');

        $response->assertStatus(200)
                 ->assertJsonStructure(['data']);
    }

    public function test_non_admin_cannot_list_users()
    {
        $user = User::factory()->create(['role' => 'reception_officer']);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/admin/users');

        $response->assertStatus(403);
    }

    public function test_admin_can_search_users()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        User::factory()->create(['name' => 'John Doe', 'email' => 'john@example.com']);
        User::factory()->create(['name' => 'Jane Smith', 'email' => 'jane@example.com']);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/users?search=John');

        $response->assertStatus(200)
                 ->assertJsonFragment(['name' => 'John Doe']);
    }

    public function test_admin_can_filter_users_by_role()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        User::factory(3)->create(['role' => 'reception_officer']);
        User::factory(2)->create(['role' => 'station_officer']);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/users?role=reception_officer');

        $response->assertStatus(200);
    }

    public function test_admin_can_create_user()
    {
        $admin = User::factory()->create(['role' => 'admin']);

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
        $admin = User::factory()->create(['role' => 'admin']);
        $user = User::factory()->create();

        $response = $this->actingAs($admin, 'sanctum')->getJson("/api/admin/users/{$user->id}");

        $response->assertStatus(200)
                 ->assertJson(['id' => $user->id]);
    }

    public function test_admin_can_update_user()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $user = User::factory()->create(['role' => 'reception_officer']);

        $response = $this->actingAs($admin, 'sanctum')->putJson("/api/admin/users/{$user->id}", [
            'name' => 'Updated Name',
            'role' => 'station_officer',
        ]);

        $response->assertStatus(200);
        $user->refresh();
        $this->assertEquals('Updated Name', $user->name);
        $this->assertEquals('station_officer', $user->role);
    }

    public function test_admin_can_delete_user()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $user = User::factory()->create();

        $response = $this->actingAs($admin, 'sanctum')->deleteJson("/api/admin/users/{$user->id}");

        $response->assertStatus(204);
        $this->assertDatabaseMissing('users', ['id' => $user->id]);
    }

    public function test_admin_cannot_delete_self()
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin, 'sanctum')->deleteJson("/api/admin/users/{$admin->id}");

        $response->assertStatus(400)
                 ->assertJsonFragment(['message' => 'You cannot delete your own account.']);
    }

    public function test_admin_can_get_statistics()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        User::factory(5)->create(['role' => 'reception_officer']);
        User::factory(3)->create(['role' => 'station_officer']);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/users/statistics');

        $response->assertStatus(200)
                 ->assertJsonStructure(['total_users', 'by_role', 'recent_users']);
    }

    public function test_admin_can_bulk_delete_users()
    {
        $admin = User::factory()->create(['role' => 'admin']);
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
        $admin = User::factory()->create(['role' => 'admin']);
        $user = User::factory()->create();

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/users/bulk-delete', [
            'user_ids' => [$admin->id, $user->id],
        ]);

        $response->assertStatus(400)
                 ->assertJsonFragment(['message' => 'You cannot delete your own account.']);
    }

    public function test_admin_can_bulk_update_role()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $user1 = User::factory()->create(['role' => 'reception_officer']);
        $user2 = User::factory()->create(['role' => 'reception_officer']);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/users/bulk-update-role', [
            'user_ids' => [$user1->id, $user2->id],
            'role' => 'station_officer',
        ]);

        $response->assertStatus(200);
        $user1->refresh();
        $user2->refresh();
        $this->assertEquals('station_officer', $user1->role);
        $this->assertEquals('station_officer', $user2->role);
    }

    public function test_admin_cannot_bulk_update_including_self()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $user = User::factory()->create();

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/users/bulk-update-role', [
            'user_ids' => [$admin->id, $user->id],
            'role' => 'station_officer',
        ]);

        $response->assertStatus(400)
                 ->assertJsonFragment(['message' => 'You cannot change your own role.']);
    }
}
