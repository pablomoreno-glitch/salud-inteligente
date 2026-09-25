<?php

namespace Tests\Feature;

use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Psr7\Request as Psr7Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ServiceUnavailableTest extends TestCase
{
    public function test_a_connection_failure_becomes_a_503_with_a_spanish_message(): void
    {
        Http::fake(function ($request) {
            throw new ConnectException('Connection refused', new Psr7Request('GET', $request->url()));
        });

        $response = $this->getJson('/api/v1/catalog/categories');

        $response->assertStatus(503)->assertExactJson(['error' => 'Servicio no disponible']);
    }

    public function test_an_unconfigured_service_url_returns_503_without_a_request(): void
    {
        config(['services.internal.advisor_url' => null]);

        Http::fake();

        $response = $this->postJson('/api/v1/advisor/chat', [
            'messages' => [['role' => 'user', 'content' => 'Hola']],
        ]);

        $response->assertStatus(503)->assertExactJson(['error' => 'Servicio no disponible']);
        Http::assertNothingSent();
    }
}
