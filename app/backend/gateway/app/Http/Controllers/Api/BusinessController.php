<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ServiceClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BusinessController extends Controller
{
    public function __construct(private readonly ServiceClient $client) {}

    public function show(): JsonResponse
    {
        return $this->client->forward('GET', config('services.internal.business_url'), 'business');
    }

    public function contacts(): JsonResponse
    {
        return $this->client->forward('GET', config('services.internal.business_url'), 'contacts');
    }

    public function services(): JsonResponse
    {
        return $this->client->forward('GET', config('services.internal.business_url'), 'services');
    }

    public function media(Request $request): JsonResponse
    {
        return $this->client->forward('GET', config('services.internal.business_url'), 'media', $request->query());
    }

    public function storeContactMessage(Request $request): JsonResponse
    {
        return $this->client->forward('POST', config('services.internal.business_url'), 'contact-messages', body: $request->all());
    }
}
