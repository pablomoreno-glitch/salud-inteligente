<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AdminProxyTest extends TestCase
{
    use RefreshDatabase;

    private function adminToken(): string
    {
        $admin = User::factory()->create(['is_admin' => true]);

        return $admin->createToken('phpunit', ['admin'])->plainTextToken;
    }

    public function test_admin_product_list_uses_the_internal_view_with_costs(): void
    {
        Http::fake(['*' => Http::response(['items' => [], 'total' => 0, 'margin_percent' => 40], 200)]);

        $this->withToken($this->adminToken())
            ->getJson('/api/admin/products')
            ->assertOk()
            ->assertJsonPath('margin_percent', 40);

        Http::assertSent(fn ($request) => $request->url() === 'http://catalog.test/admin/products');
    }

    public function test_admin_can_change_the_margin(): void
    {
        Http::fake(['*' => Http::response(['margin_percent' => 50, 'products_repriced' => 103], 200)]);

        $this->withToken($this->adminToken())
            ->putJson('/api/admin/pricing', ['margin_percent' => 50])
            ->assertOk()
            ->assertJsonPath('products_repriced', 103);

        Http::assertSent(fn ($request) => $request->method() === 'PUT' && $request->url() === 'http://catalog.test/pricing');
    }

    public function test_pricing_is_admin_only(): void
    {
        $this->putJson('/api/admin/pricing', ['margin_percent' => 0])->assertUnauthorized();
    }

    public function test_admin_can_list_order_sms_notifications(): void
    {
        Http::fake(['notifications.test/*' => Http::response(['items' => [['order_code' => 'SI-000001', 'status' => 'sent']], 'total' => 1], 200)]);

        $this->withToken($this->adminToken())
            ->getJson('/api/admin/notifications')
            ->assertOk()
            ->assertJsonPath('items.0.status', 'sent');

        Http::assertSent(fn ($request) => str_starts_with($request->url(), 'http://notifications.test/notifications')
            && $request->hasHeader('X-Internal-Token', 'test-internal-token'));
    }

    public function test_notifications_are_admin_only(): void
    {
        $this->getJson('/api/admin/notifications')->assertUnauthorized();
    }

    public function test_admin_can_patch_a_product_by_ref(): void
    {
        Http::fake(['*' => Http::response(['ref' => 'VW-158', 'price' => 45000], 200)]);

        $this->withToken($this->adminToken())
            ->patchJson('/api/admin/products/VW-158', ['price' => 45000])
            ->assertOk()
            ->assertJsonPath('price', 45000);

        Http::assertSent(fn ($request) => str_contains($request->url(), 'products/VW-158')
            && $request['price'] === 45000);
    }

    public function test_admin_order_status_update_is_proxied(): void
    {
        Http::fake(['*' => Http::response(['id' => 7, 'status' => 'confirmed'], 200)]);

        $this->withToken($this->adminToken())
            ->patchJson('/api/admin/orders/7/status', ['status' => 'confirmed'])
            ->assertOk()
            ->assertJsonPath('status', 'confirmed');
    }
}
