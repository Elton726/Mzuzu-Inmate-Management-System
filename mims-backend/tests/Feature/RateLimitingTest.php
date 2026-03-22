<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Support\Facades\Cache;
use App\Services\RateLimitService;

class RateLimitingTest extends TestCase
{
    protected RateLimitService $rateLimitService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->rateLimitService = app(RateLimitService::class);
        Cache::flush(); // Clear cache before each test
    }

    public function test_rate_limiting_allows_requests_within_limit(): void
    {
        $key = 'test_ip';

        for ($i = 0; $i < 3; $i++) {
            $limit = $this->rateLimitService->checkLimit($key, 5, 60);
            $this->assertTrue($limit['allowed']);
        }
    }

    public function test_rate_limiting_blocks_requests_exceeding_limit(): void
    {
        $key = 'test_ip_exceed';

        // Make 5 requests (the limit)
        for ($i = 0; $i < 5; $i++) {
            $limit = $this->rateLimitService->checkLimit($key, 5, 60);
            $this->assertTrue($limit['allowed']);
        }

        // 6th request should be blocked
        $limit = $this->rateLimitService->checkLimit($key, 5, 60);
        $this->assertFalse($limit['allowed']);
    }

    public function test_rate_limit_resets_after_window(): void
    {
        $key = 'test_window_reset';

        // Exhaust limit
        for ($i = 0; $i < 5; $i++) {
            $this->rateLimitService->checkLimit($key, 5, 1); // 1 second window
        }

        $limit = $this->rateLimitService->checkLimit($key, 5, 1);
        $this->assertFalse($limit['allowed']);

        // Wait for window to pass
        sleep(2);

        // Should be allowed again
        $limit = $this->rateLimitService->checkLimit($key, 5, 1);
        $this->assertTrue($limit['allowed']);
    }

    public function test_lockout_after_max_attempts(): void
    {
        $key = 'test_lockout_key';

        // Record failures up to max
        for ($i = 0; $i < 10; $i++) {
            $result = $this->rateLimitService->recordFailure($key, 10, 15, 60);
        }

        $this->assertTrue($result['locked']);
        $this->assertNotNull($result['locked_until']);
    }

    public function test_lockout_blocks_requests(): void
    {
        $key = 'test_lockout_block';

        // Lock out the key
        for ($i = 0; $i < 10; $i++) {
            $this->rateLimitService->recordFailure($key, 10, 15, 60);
        }

        // Check lockout
        $lockout = $this->rateLimitService->checkLockout($key);
        $this->assertTrue($lockout['locked']);
    }

    public function test_clear_limit_removes_cache(): void
    {
        $key = 'test_clear_key';

        // Make a request
        $this->rateLimitService->checkLimit($key, 5, 60);

        // Clear the limit
        $this->rateLimitService->clearLimit($key);

        // Create fresh limit - should start at 1
        $limit = $this->rateLimitService->checkLimit($key, 5, 60);
        $this->assertTrue($limit['allowed']);
        $this->assertEquals(4, $limit['remaining']);
    }

    public function test_bypass_paths_not_throttled(): void
    {
        $bypassed = $this->rateLimitService->shouldBypass('192.168.1.1', 'api/health');
        $this->assertTrue($bypassed);

        $notBypassed = $this->rateLimitService->shouldBypass('192.168.1.1', 'api/login');
        $this->assertFalse($notBypassed);
    }

    public function test_login_endpoint_throttling(): void
    {
        // Try 5 successful logins
        for ($i = 0; $i < 5; $i++) {
            $response = $this->postJson('/api/login', [
                'email' => 'test@example.com',
                'password' => 'password',
            ]);

            // Will fail auth but not rate limit
            $this->assertNotEquals(429, $response->status());
        }

        // 6th should be rate limited
        $response = $this->postJson('/api/login', [
            'email' => 'test@example.com',
            'password' => 'password',
        ]);

        $this->assertEquals(429, $response->status());
    }

    public function test_rate_limit_headers_present(): void
    {
        $response = $this->actingAs($this->createUser())
            ->getJson('/api/user');

        $this->assertTrue($response->headers->has('X-RateLimit-Limit'));
        $this->assertTrue($response->headers->has('X-RateLimit-Remaining'));
        $this->assertTrue($response->headers->has('X-RateLimit-Reset'));
        $this->assertTrue($response->headers->has('Retry-After'));
    }

    protected function createUser()
    {
        return \App\Models\User::factory()->create();
    }
}
