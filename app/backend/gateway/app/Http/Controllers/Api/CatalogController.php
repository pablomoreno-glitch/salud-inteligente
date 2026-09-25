<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ServiceClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CatalogController extends Controller
{
    public function __construct(private readonly ServiceClient $client) {}

    public function categories(): JsonResponse
    {
        return $this->client->forward('GET', config('services.internal.catalog_url'), 'categories');
    }

    public function needs(): JsonResponse
    {
        return $this->client->forward('GET', config('services.internal.catalog_url'), 'needs');
    }

    public function products(Request $request): JsonResponse
    {
        // The public list never forwards include_inactive: only the admin
        // catalog proxy (which sets it itself) is allowed to see inactive
        // products.
        $query = $request->query();
        unset($query['include_inactive']);

        return $this->client->forward('GET', config('services.internal.catalog_url'), 'products', $query);
    }

    public function show(string $slug): JsonResponse
    {
        return $this->client->forward('GET', config('services.internal.catalog_url'), "products/{$slug}");
    }

    public function related(string $slug): JsonResponse
    {
        return $this->client->forward('GET', config('services.internal.catalog_url'), "products/{$slug}/related");
    }
}
