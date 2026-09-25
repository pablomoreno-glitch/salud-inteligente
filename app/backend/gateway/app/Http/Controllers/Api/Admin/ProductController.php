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
        $query = array_merge($request->query(), ['include_inactive' => 'true']);

        return $this->client->forward('GET', config('services.internal.catalog_url'), 'products', $query);
    }

    public function update(Request $request, string $ref): JsonResponse
    {
        return $this->client->forward('PATCH', config('services.internal.catalog_url'), "products/{$ref}", body: $request->all());
    }
}
