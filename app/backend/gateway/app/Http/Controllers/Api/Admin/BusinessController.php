<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\ServiceClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BusinessController extends Controller
{
    public function __construct(private readonly ServiceClient $client) {}

    public function update(Request $request): JsonResponse
    {
        return $this->client->forward('PATCH', config('services.internal.business_url'), 'profile', body: $request->all());
    }
}
