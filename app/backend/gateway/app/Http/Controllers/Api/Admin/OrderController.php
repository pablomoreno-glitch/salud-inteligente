<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\ServiceClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function __construct(private readonly ServiceClient $client) {}

    public function index(Request $request): JsonResponse
    {
        return $this->client->forward('GET', config('services.internal.orders_url'), 'orders', $request->query());
    }

    public function show(string $id): JsonResponse
    {
        return $this->client->forward('GET', config('services.internal.orders_url'), "orders/{$id}");
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        return $this->client->forward('PATCH', config('services.internal.orders_url'), "orders/{$id}/status", body: $request->all());
    }
}
