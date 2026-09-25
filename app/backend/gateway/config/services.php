<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Internal domain services
    |--------------------------------------------------------------------------
    |
    | Base URLs for the FastAPI microservices behind the gateway, plus the
    | shared token the gateway sends on every upstream call.
    |
    */

    'internal' => [
        'business_url' => env('SERVICE_BUSINESS_URL'),
        'catalog_url' => env('SERVICE_CATALOG_URL'),
        'inventory_url' => env('SERVICE_INVENTORY_URL'),
        'orders_url' => env('SERVICE_ORDERS_URL'),
        'advisor_url' => env('SERVICE_ADVISOR_URL'),
        'notifications_url' => env('SERVICE_NOTIFICATIONS_URL'),
        'internal_token' => env('INTERNAL_TOKEN'),
    ],

];
