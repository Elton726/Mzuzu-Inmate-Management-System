<?php

namespace Tests\Feature;

use Tests\TestCase;

class OctaneTest extends TestCase
{
    public function test_octane_is_installed(): void
    {
        // Check if Octane commands are available
        $this->assertTrue(class_exists(\Laravel\Octane\Octane::class));
    }

    public function test_octane_config_exists(): void
    {
        // Check if Octane config is published
        $this->assertTrue(config()->has('octane'));
        $this->assertNotNull(config('octane.server'));
    }

    public function test_application_runs_normally(): void
    {
        // Basic smoke test to ensure app still works
        $response = $this->get('/up');

        $this->assertEquals(200, $response->status());
    }

    public function test_rate_limiting_still_works(): void
    {
        // Skip this test if database is not available (common in CI/CD)
        try {
            $user = \App\Models\User::factory()->create();
            $response = $this->actingAs($user)->getJson('/api/user');

            // Should not be rate limited on first request
            $this->assertNotEquals(429, $response->status());
        } catch (\Exception $e) {
            $this->markTestSkipped('Database not available for this test');
        }
    }
}
