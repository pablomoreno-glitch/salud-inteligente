<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class HealthTest extends TestCase
{
    public function test_health_is_ok_when_every_service_answers(): void
    {
        Http::fake(['*/health' => Http::response(['status' => 'ok'], 200)]);

        $response = $this->getJson('/api/v1/health');

        $response->assertOk()
            ->assertJsonPath('status', 'ok')
            ->assertJsonPath('services.catalog.status', 'ok')
            ->assertJsonPath('services.advisor.status', 'ok');
    }

    public function test_health_is_degraded_when_one_service_is_down(): void
    {
        Http::fake([
            'advisor.test/*' => Http::response(['error' => 'down'], 500),
            '*/health' => Http::response(['status' => 'ok'], 200),
        ]);

        $response = $this->getJson('/api/v1/health');

        $response->assertOk()
            ->assertJsonPath('status', 'degraded')
            ->assertJsonPath('services.advisor.status', 'down')
            ->assertJsonPath('services.catalog.status', 'ok');
    }
}
