<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;

/**
 * Thin HTTP client used by every proxy controller to reach the internal
 * FastAPI microservices. It always authenticates with the internal token,
 * forwards the query string and JSON body untouched, and turns connection
 * failures into a uniform 503 instead of letting an exception bubble up.
 */
class ServiceClient
{
    public const DEFAULT_TIMEOUT = 10;

    public const ADVISOR_TIMEOUT = 70;

    /**
     * Forward a request to an upstream service and return its response
     * (status and JSON body) unchanged.
     *
     * @param  array<string, mixed>  $query
     * @param  array<string, mixed>|null  $body
     */
    public function forward(
        string $method,
        ?string $baseUrl,
        string $path,
        array $query = [],
        ?array $body = null,
        int $timeout = self::DEFAULT_TIMEOUT,
    ): JsonResponse {
        if (! $baseUrl) {
            return response()->json(['error' => 'Servicio no disponible'], 503);
        }

        $url = rtrim($baseUrl, '/').'/'.ltrim($path, '/');

        if ($query !== []) {
            $url .= '?'.http_build_query($query);
        }

        $request = Http::withHeaders([
            'X-Internal-Token' => (string) config('services.internal.internal_token'),
            'Accept' => 'application/json',
        ])->timeout($timeout);

        try {
            $options = $body === null ? [] : ['json' => $body];
            $response = $request->send($method, $url, $options);
        } catch (ConnectionException) {
            return response()->json(['error' => 'Servicio no disponible'], 503);
        }

        $decoded = $response->body() === '' ? null : $response->json();

        return response()->json($decoded, $response->status());
    }
}
