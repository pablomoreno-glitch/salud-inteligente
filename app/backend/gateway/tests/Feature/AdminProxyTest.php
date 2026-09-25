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

    public function test_admin_product_list_always_includes_inactive_products(): void
    {
        Http::fake(['*' => Http::response(['items' => []], 200)]);

        $this->withToken($this->adminToken())
            ->getJson('/api/admin/products')
            ->assertOk();

        Http::assertSent(fn ($request) => str_contains($request->url(), 'include_inactive=true'));
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
