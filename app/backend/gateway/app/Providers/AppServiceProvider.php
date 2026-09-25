<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Per-minute limits for each public surface (design.md section 5).
     *
     * Named limiters keep one counter per limiter and client IP. The anonymous
     * `throttle:N,1` form shares a single counter per IP across every route, so
     * browsing the catalog would use up the checkout allowance.
     */
    public const LIMITS = [
        'public-read' => 120,
        'contact' => 5,
        'cart' => 60,
        'checkout' => 10,
        'tracking' => 30,
        'advisor' => 15,
        'admin-login' => 5,
    ];

    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        foreach (self::LIMITS as $name => $perMinute) {
            RateLimiter::for($name, fn (Request $request) => Limit::perMinute($perMinute)->by($name.'|'.$request->ip()));
        }
    }
}
