<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PublicAllowlistTest extends TestCase
{
    public function test_allowlisted_catalog_read_is_proxied_with_the_same_status_code(): void
    {
        Http::fake([
            '*' => Http::response(['items' => [], 'total' => 0, 'limit' => 24, 'offset' => 0], 200),
        ]);

        $response = $this->getJson('/api/v1/catalog/products?need=sueno');

        $response->assertOk()->assertJson(['total' => 0]);

        Http::assertSent(function ($request) {
            return str_contains($request->url(), 'catalog.test/products')
                && $request->hasHeader('X-Internal-Token', 'test-internal-token')
                && $request->hasHeader('Accept', 'application/json');
        });
    }

    public function test_upstream_status_is_passed_through_unchanged(): void
    {
        Http::fake([
            '*' => Http::response(['error' => 'No encontrado'], 404),
        ]);

        $response = $this->getJson('/api/v1/catalog/products/no-existe');

        $response->assertStatus(404)->assertJson(['error' => 'No encontrado']);
    }

    public function test_public_product_list_never_forwards_include_inactive(): void
    {
        Http::fake(['*' => Http::response(['items' => []], 200)]);

        $this->getJson('/api/v1/catalog/products?include_inactive=true')->assertOk();

        Http::assertSent(function ($request) {
            return ! str_contains($request->url(), 'include_inactive');
        });
    }

    public function test_internal_routes_are_not_reachable_from_public_traffic(): void
    {
        // /v1/inventory/stock is an internal-only endpoint; there is no
        // public route for it, so it must 404 without ever reaching the
        // service.
        Http::fake();

        $this->getJson('/api/v1/inventory/stock')->assertNotFound();
        Http::assertNothingSent();
    }

    public function test_admin_only_orders_route_requires_authentication(): void
    {
        Http::fake();

        // The internal orders list is never exposed on the public /v1 prefix,
        // only under /admin behind Sanctum + EnsureAdmin.
        $this->getJson('/api/v1/orders')->assertStatus(405);
        Http::assertNothingSent();

        $this->getJson('/api/admin/orders')->assertUnauthorized();
        Http::assertNothingSent();
    }

    public function test_business_contact_message_route_is_throttled_after_five_requests(): void
    {
        Http::fake(['*' => Http::response(['id' => 1], 201)]);

        $payload = ['name' => 'Ana', 'phone' => '3000000000', 'message' => 'Hola'];

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/business/contact-messages', $payload)->assertCreated();
        }

        $this->postJson('/api/v1/business/contact-messages', $payload)->assertTooManyRequests();
    }

    public function test_browsing_does_not_use_up_the_checkout_limit(): void
    {
        Http::fake([
            'catalog.test/*' => Http::response(['items' => [], 'total' => 0, 'limit' => 24, 'offset' => 0], 200),
            'orders.test/*' => Http::response(['order' => ['code' => 'SI-000001'], 'whatsapp_url' => null], 201),
        ]);

        // More catalog reads than the checkout allowance of 10 per minute.
        for ($i = 0; $i < 15; $i++) {
            $this->getJson('/api/v1/catalog/products')->assertOk();
        }

        $this->postJson('/api/v1/orders', ['cart_token' => 'x'])->assertCreated();
    }

    public function test_rate_limits_use_the_client_ip_forwarded_by_the_internal_proxy(): void
    {
        Http::fake(['*' => Http::response(['id' => 1], 201)]);

        $payload = ['name' => 'Ana', 'phone' => '3000000000', 'message' => 'Hola'];
        $fromProxy = fn (string $clientIp) => $this->withServerVariables(['REMOTE_ADDR' => '172.20.0.5'])
            ->withHeader('X-Forwarded-For', $clientIp);

        for ($i = 0; $i < 5; $i++) {
            $fromProxy('203.0.113.10')->postJson('/api/v1/business/contact-messages', $payload)->assertCreated();
        }

        // Another customer behind the same proxy keeps their own allowance.
        $fromProxy('203.0.113.20')->postJson('/api/v1/business/contact-messages', $payload)->assertCreated();
        $fromProxy('203.0.113.10')->postJson('/api/v1/business/contact-messages', $payload)->assertTooManyRequests();
    }

    public function test_advisor_chat_is_proxied(): void
    {
        Http::fake([
            '*' => Http::response(['reply' => 'Hola', 'recommendations' => [], 'model' => 'claude'], 200),
        ]);

        $response = $this->postJson('/api/v1/advisor/chat', [
            'messages' => [['role' => 'user', 'content' => 'Necesito algo para dormir']],
        ]);

        $response->assertOk()->assertJsonPath('reply', 'Hola');
        Http::assertSent(fn ($request) => str_contains($request->url(), 'advisor.test/chat'));
    }
}
