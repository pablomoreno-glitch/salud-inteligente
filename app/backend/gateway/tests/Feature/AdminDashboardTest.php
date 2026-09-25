<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AdminDashboardTest extends TestCase
{
    use RefreshDatabase;

    private function adminToken(): string
    {
        $admin = User::factory()->create(['is_admin' => true]);

        return $admin->createToken('phpunit', ['admin'])->plainTextToken;
    }

    public function test_dashboard_aggregates_every_service_when_all_are_healthy(): void
    {
        Http::fake([
            'orders.test/*' => Http::response(['orders_total' => 12], 200),
            'inventory.test/*' => Http::response(['tracked' => 3], 200),
            'advisor.test/*' => Http::response(['conversations' => 5], 200),
            'catalog.test/*' => Http::response(['products' => 209], 200),
            'business.test/*' => Http::response(['items' => [], 'total' => 4], 200),
        ]);

        $response = $this->withToken($this->adminToken())->getJson('/api/admin/dashboard?days=30');

        $response->assertOk()
            ->assertJsonPath('orders.orders_total', 12)
            ->assertJsonPath('inventory.tracked', 3)
            ->assertJsonPath('advisor.conversations', 5)
            ->assertJsonPath('catalog.products', 209)
            ->assertJsonPath('messages.new', 4)
            ->assertJsonPath('errors', []);
    }

    public function test_dashboard_degrades_gracefully_when_one_service_is_down(): void
    {
        Http::fake([
            'advisor.test/*' => Http::response(['error' => 'boom'], 500),
            '*' => Http::response(['ok' => true, 'total' => 1], 200),
        ]);

        $response = $this->withToken($this->adminToken())->getJson('/api/admin/dashboard?days=30');

        $response->assertOk()
            ->assertJsonPath('advisor', null)
            ->assertJsonPath('errors', ['advisor'])
            ->assertJsonPath('orders.ok', true);
    }
}
