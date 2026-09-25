<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\ServiceClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    public function __construct(private readonly ServiceClient $client) {}

    public function index(Request $request): JsonResponse
    {
        return $this->client->forward('GET', config('services.internal.inventory_url'), 'stock', $request->query());
    }

    public function update(Request $request, string $ref): JsonResponse
    {
        return $this->client->forward('PATCH', config('services.internal.inventory_url'), "stock/{$ref}", body: $request->all());
    }
}
