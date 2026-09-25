<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ServiceClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdvisorController extends Controller
{
    public function __construct(private readonly ServiceClient $client) {}

    public function chat(Request $request): JsonResponse
    {
        return $this->client->forward(
            'POST',
            config('services.internal.advisor_url'),
            'chat',
            body: $request->all(),
            timeout: ServiceClient::ADVISOR_TIMEOUT,
        );
    }
}
