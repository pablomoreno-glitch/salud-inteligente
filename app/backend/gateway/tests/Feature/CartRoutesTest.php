<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class CartRoutesTest extends TestCase
{
    public function test_cart_token_route_requires_a_uuid(): void
    {
        Http::fake();

        $this->getJson('/api/v1/cart/not-a-uuid')->assertNotFound();
        Http::assertNothingSent();
    }

    public function test_cart_is_proxied_to_orders_for_a_valid_token(): void
    {
        $token = (string) Str::uuid();

        Http::fake(['*' => Http::response(['token' => $token, 'items' => []], 200)]);

        $this->getJson("/api/v1/cart/{$token}")->assertOk();

        Http::assertSent(fn ($request) => str_contains($request->url(), "carts/{$token}"));
    }

    public function test_order_tracking_requires_the_si_code_pattern(): void
    {
        Http::fake();

        $this->getJson('/api/v1/orders/track/not-a-code')->assertNotFound();
        Http::assertNothingSent();
    }
}
