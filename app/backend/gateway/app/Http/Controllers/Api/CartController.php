<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ServiceClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CartController extends Controller
{
    public function __construct(private readonly ServiceClient $client) {}

    public function store(): JsonResponse
    {
        return $this->client->forward('POST', config('services.internal.orders_url'), 'carts', body: []);
    }

    public function show(string $token): JsonResponse
    {
        return $this->client->forward('GET', config('services.internal.orders_url'), "carts/{$token}");
    }

    public function updateItem(Request $request, string $token, string $ref): JsonResponse
    {
        return $this->client->forward('PUT', config('services.internal.orders_url'), "carts/{$token}/items/{$ref}", body: $request->all());
    }

    public function destroyItem(string $token, string $ref): JsonResponse
    {
        return $this->client->forward('DELETE', config('services.internal.orders_url'), "carts/{$token}/items/{$ref}");
    }

    public function clear(string $token): JsonResponse
    {
        return $this->client->forward('DELETE', config('services.internal.orders_url'), "carts/{$token}/items");
    }
}
