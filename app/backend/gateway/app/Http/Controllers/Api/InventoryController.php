<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ServiceClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    public function __construct(private readonly ServiceClient $client) {}

    public function availability(Request $request): JsonResponse
    {
        return $this->client->forward('GET', config('services.internal.inventory_url'), 'availability', $request->query());
    }
}
