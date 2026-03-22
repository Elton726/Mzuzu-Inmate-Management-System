<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_view_own_profile()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/user/profile');

        $response->assertStatus(200)
                 ->assertJson(['id' => $user->id, 'email' => $user->email]);
    }

    public function test_user_can_view_own_profile_via_show()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/user/' . $user->id);

        $response->assertStatus(200)
                 ->assertJson(['id' => $user->id]);
    }

    public function test_user_cannot_view_other_profile()
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/user/' . $otherUser->id);

        $response->assertStatus(403)
                 ->assertJsonFragment(['message' => 'Forbidden. You can only view your own profile.']);
    }

    public function test_user_can_update_own_profile()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->putJson('/api/user/profile', [
            'name' => 'Updated Name',
        ]);

        $response->assertStatus(200)
                 ->assertJsonFragment(['name' => 'Updated Name']);
    }

    public function test_user_can_change_password()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/user/change-password', [
            'current_password' => 'password',
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ]);

        $response->assertStatus(200)
                 ->assertJsonFragment(['message' => 'Password changed successfully']);
    }

    public function test_user_cannot_change_password_with_wrong_current_password()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/user/change-password', [
            'current_password' => 'wrongpassword',
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ]);

        $response->assertStatus(422)
                 ->assertJsonFragment(['message' => 'Current password is incorrect.']);
    }

    public function test_user_can_update_email()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->putJson('/api/user/profile', [
            'email' => 'newemail@example.com',
        ]);

        $response->assertStatus(200);
        $user->refresh();
        $this->assertEquals('newemail@example.com', $user->email);
    }

    public function test_user_cannot_update_to_existing_email()
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->putJson('/api/user/profile', [
            'email' => $otherUser->email,
        ]);

        $response->assertStatus(422)
                 ->assertJsonStructure(['message', 'errors']);
    }
}

