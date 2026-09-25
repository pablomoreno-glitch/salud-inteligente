<?php

use App\Http\Controllers\Api\Admin\AdminAuthController;
use App\Http\Controllers\Api\Admin\BusinessController as AdminBusinessController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\InventoryController as AdminInventoryController;
use App\Http\Controllers\Api\Admin\MessageController as AdminMessageController;
use App\Http\Controllers\Api\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Api\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Api\AdvisorController;
use App\Http\Controllers\Api\BusinessController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Middleware\EnsureAdmin;
use Illuminate\Support\Facades\Route;

// This file is the whole public surface of the gateway: an explicit
// allowlist, no catch-all proxy. Every route maps to exactly one upstream
// endpoint from design.md section 5.

/*
|--------------------------------------------------------------------------
| Public routes
|--------------------------------------------------------------------------
*/

Route::get('/v1/health', [HealthController::class, 'index']);

Route::middleware('throttle:public-read')->group(function () {
    Route::get('/v1/business', [BusinessController::class, 'show']);
    Route::get('/v1/business/contacts', [BusinessController::class, 'contacts']);
    Route::get('/v1/business/services', [BusinessController::class, 'services']);
    Route::get('/v1/business/media', [BusinessController::class, 'media']);

    Route::get('/v1/catalog/categories', [CatalogController::class, 'categories']);
    Route::get('/v1/catalog/needs', [CatalogController::class, 'needs']);
    Route::get('/v1/catalog/products', [CatalogController::class, 'products']);
    Route::get('/v1/catalog/products/{slug}', [CatalogController::class, 'show'])
        ->where('slug', '[a-z0-9-]+');
    Route::get('/v1/catalog/products/{slug}/related', [CatalogController::class, 'related'])
        ->where('slug', '[a-z0-9-]+');

    Route::get('/v1/inventory/availability', [InventoryController::class, 'availability']);
});

Route::post('/v1/business/contact-messages', [BusinessController::class, 'storeContactMessage'])
    ->middleware('throttle:contact');

Route::middleware('throttle:cart')->group(function () {
    Route::post('/v1/cart', [CartController::class, 'store']);
    Route::get('/v1/cart/{token}', [CartController::class, 'show'])
        ->whereUuid('token');
    Route::put('/v1/cart/{token}/items/{ref}', [CartController::class, 'updateItem'])
        ->whereUuid('token')->where('ref', '[A-Za-z0-9-]+');
    Route::delete('/v1/cart/{token}/items/{ref}', [CartController::class, 'destroyItem'])
        ->whereUuid('token')->where('ref', '[A-Za-z0-9-]+');
    Route::delete('/v1/cart/{token}/items', [CartController::class, 'clear'])
        ->whereUuid('token');
});

Route::post('/v1/orders', [OrderController::class, 'store'])
    ->middleware('throttle:checkout');

Route::get('/v1/orders/track/{code}', [OrderController::class, 'track'])
    ->where('code', 'SI-[0-9]+')
    ->middleware('throttle:tracking');

Route::post('/v1/advisor/chat', [AdvisorController::class, 'chat'])
    ->middleware('throttle:advisor');

/*
|--------------------------------------------------------------------------
| Admin routes
|--------------------------------------------------------------------------
*/

Route::post('/admin/login', [AdminAuthController::class, 'login'])
    ->middleware('throttle:admin-login');

Route::middleware(['auth:sanctum', EnsureAdmin::class])->group(function () {
    Route::get('/admin/me', [AdminAuthController::class, 'me']);
    Route::post('/admin/logout', [AdminAuthController::class, 'logout']);

    Route::get('/admin/dashboard', [DashboardController::class, 'index']);

    Route::get('/admin/orders', [AdminOrderController::class, 'index']);
    Route::get('/admin/orders/{id}', [AdminOrderController::class, 'show'])
        ->where('id', '[0-9]+');
    Route::patch('/admin/orders/{id}/status', [AdminOrderController::class, 'updateStatus'])
        ->where('id', '[0-9]+');

    Route::get('/admin/inventory', [AdminInventoryController::class, 'index']);
    Route::patch('/admin/inventory/{ref}', [AdminInventoryController::class, 'update'])
        ->where('ref', '[A-Za-z0-9-]+');

    Route::get('/admin/products', [AdminProductController::class, 'index']);
    Route::patch('/admin/products/{ref}', [AdminProductController::class, 'update'])
        ->where('ref', '[A-Za-z0-9-]+');

    Route::get('/admin/messages', [AdminMessageController::class, 'index']);
    Route::patch('/admin/messages/{id}', [AdminMessageController::class, 'update'])
        ->where('id', '[0-9]+');

    Route::patch('/admin/business', [AdminBusinessController::class, 'update']);
});
