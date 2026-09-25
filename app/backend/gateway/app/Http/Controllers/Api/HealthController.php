<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Client\Response;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Throwable;

class HealthController extends Controller
{
    public function index(): JsonResponse
    {
        $services = [
            'business' => config('services.internal.business_url'),
            'catalog' => config('services.internal.catalog_url'),
            'inventory' => config('services.internal.inventory_url'),
            'orders' => config('services.internal.orders_url'),
            'advisor' => config('services.internal.advisor_url'),
        ];

        $reachable = array_filter($services);
        $started = microtime(true);

        $responses = $reachable === [] ? [] : Http::pool(function ($pool) use ($reachable) {
            $requests = [];

            foreach ($reachable as $name => $baseUrl) {
                $requests[$name] = $pool->as($name)
                    ->withHeaders(['X-Internal-Token' => (string) config('services.internal.internal_token')])
                    ->timeout(5)
                    ->get(rtrim($baseUrl, '/').'/health');
            }

            return $requests;
        });

        $latency = (int) ((microtime(true) - $started) * 1000);

        $results = [];
        $overall = 'ok';

        foreach ($services as $name => $baseUrl) {
            $response = $responses[$name] ?? null;
            $ok = $baseUrl
                && $response instanceof Response
                && ! $response instanceof Throwable
                && $response->successful();

            $results[$name] = [
                'status' => $ok ? 'ok' : 'down',
                'latency_ms' => $ok ? $latency : 0,
            ];

            if (! $ok) {
                $overall = 'degraded';
            }
        }

        return response()->json([
            'status' => $overall,
            'services' => $results,
        ]);
    }
}
