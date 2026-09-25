<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\ServiceClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function __construct(private readonly ServiceClient $client) {}

    /** SMS sent (or skipped) for new orders, newest first. */
    public function index(Request $request): JsonResponse
    {
        return $this->client->forward('GET', config('services.internal.notifications_url'), 'notifications', $request->query());
    }

    /** Whether Twilio is configured and which phone receives the order SMS. */
    public function status(): JsonResponse
    {
        return $this->client->forward('GET', config('services.internal.notifications_url'), 'status');
    }
}
