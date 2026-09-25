<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\ServiceClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    public function __construct(private readonly ServiceClient $client) {}

    public function index(Request $request): JsonResponse
    {
        return $this->client->forward('GET', config('services.internal.business_url'), 'contact-messages', $request->query());
    }

    public function update(Request $request, string $id): JsonResponse
    {
        return $this->client->forward('PATCH', config('services.internal.business_url'), "contact-messages/{$id}", body: $request->all());
    }
}
