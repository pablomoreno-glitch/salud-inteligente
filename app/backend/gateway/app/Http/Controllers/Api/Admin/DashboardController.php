<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Client\Response;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class DashboardController extends Controller
{
    /**
     * Aggregate the KPIs shown on the admin home. Every upstream is called
     * concurrently; a single slow or failing service never blanks the whole
     * dashboard, it just turns its own section null and is named in errors.
     */
    public function index(Request $request): JsonResponse
    {
        $days = (int) $request->query('days', 30);
        $token = (string) config('services.internal.internal_token');

        $endpoints = [
            'orders' => [config('services.internal.orders_url'), "metrics?days={$days}"],
            'inventory' => [config('services.internal.inventory_url'), 'summary'],
            'advisor' => [config('services.internal.advisor_url'), "stats?days={$days}"],
            'catalog' => [config('services.internal.catalog_url'), 'summary'],
            'business' => [config('services.internal.business_url'), 'contact-messages?status=new&limit=1'],
        ];

        $reachable = array_filter($endpoints, fn (array $endpoint) => (bool) $endpoint[0]);

        $responses = $reachable === [] ? [] : Http::pool(function ($pool) use ($reachable, $token) {
            $requests = [];

            foreach ($reachable as $name => [$baseUrl, $path]) {
                $requests[$name] = $pool->as($name)
                    ->withHeaders(['X-Internal-Token' => $token, 'Accept' => 'application/json'])
                    ->timeout(10)
                    ->get(rtrim($baseUrl, '/').'/'.$path);
            }

            return $requests;
        });

        $errors = [];
        $result = [];

        foreach ($endpoints as $name => [$baseUrl]) {
            $response = $responses[$name] ?? null;

            if (! $baseUrl || ! $response instanceof Response || ! $response->successful()) {
                $result[$name] = null;
                $errors[] = $name;

                continue;
            }

            $result[$name] = $response->json();
        }

        return response()->json([
            'orders' => $result['orders'],
            'inventory' => $result['inventory'],
            'advisor' => $result['advisor'],
            'catalog' => $result['catalog'],
            'messages' => ['new' => $result['business']['total'] ?? null],
            'errors' => $errors,
        ]);
    }
}
