<?php

namespace Tests\Feature\Auth;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_users_can_register(): void
    {
        $adminRole = Role::firstOrCreate(['name' => 'admin'], ['description' => null]);
        $admin = User::factory()->create(['role_id' => $adminRole->id]);

        $response = $this->actingAs($admin, 'sanctum')->post('/api/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'role' => 'reception_officer',
        ]);

        $response->assertStatus(201)
                 ->assertJson(['name' => 'Test User', 'email' => 'test@example.com']);
    }
}
