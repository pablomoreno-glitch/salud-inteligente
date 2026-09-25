<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ServiceClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function __construct(private readonly ServiceClient $client) {}

    public function store(Request $request): JsonResponse
    {
        return $this->client->forward('POST', config('services.internal.orders_url'), 'orders', body: $request->all());
    }

    public function track(Request $request, string $code): JsonResponse
    {
        return $this->client->forward('GET', config('services.internal.orders_url'), "orders/track/{$code}", $request->query());
    }
}
