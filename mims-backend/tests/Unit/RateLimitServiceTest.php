<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Services\RateLimitService;
use Illuminate\Support\Facades\Cache;

class RateLimitServiceTest extends TestCase
{
    protected RateLimitService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(RateLimitService::class);
        Cache::flush();
    }

    public function test_get_key_format_ip(): void
    {
        $key = $this->service->getKey('192.168.1.1', 'ip');
        $this->assertEquals('ip:192.168.1.1', $key);
    }

    public function test_get_key_format_user(): void
    {
        $key = $this->service->getKey(123, 'user');
        $this->assertEquals('user:123', $key);
    }

    public function test_remaining_requests_calculation(): void
    {
        // First request
        $result = $this->service->checkLimit('test', 10, 60);
        $this->assertEquals(9, $result['remaining']);

        // Fifth request
        for ($i = 0; $i < 4; $i++) {
            $this->service->checkLimit('test', 10, 60);
        }
        $result = $this->service->checkLimit('test', 10, 60);
        $this->assertEquals(4, $result['remaining']);
    }

    public function test_reset_at_timestamp(): void
    {
        $result = $this->service->checkLimit('test', 10, 60);
        $now = now()->timestamp;

        // Reset should be approximately 60 seconds from now
        $this->assertGreaterThanOrEqual($now + 59, $result['reset_at']);
        $this->assertLessThanOrEqual($now + 61, $result['reset_at']);
    }

    public function test_retry_after_calculation(): void
    {
        for ($i = 0; $i < 10; $i++) {
            $this->service->checkLimit('retry_test', 10, 60);
        }

        $result = $this->service->checkLimit('retry_test', 10, 60);
        $this->assertFalse($result['allowed']);
        $this->assertIsInt($result['retry_after']);
        $this->assertGreaterThan(0, $result['retry_after']);
    }
}
