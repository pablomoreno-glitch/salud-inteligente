<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\ServiceClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function __construct(private readonly ServiceClient $client) {}

    public function index(Request $request): JsonResponse
    {
        // Admin view: every product with supplier cost, references and margin.
        return $this->client->forward('GET', config('services.internal.catalog_url'), 'admin/products');
    }

    public function update(Request $request, string $ref): JsonResponse
    {
        return $this->client->forward('PATCH', config('services.internal.catalog_url'), "products/{$ref}", body: $request->all());
    }

    public function pricing(): JsonResponse
    {
        return $this->client->forward('GET', config('services.internal.catalog_url'), 'pricing');
    }

    public function updatePricing(Request $request): JsonResponse
    {
        return $this->client->forward('PUT', config('services.internal.catalog_url'), 'pricing', body: $request->all());
    }
}
