<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * The gateway only speaks JSON. Without this, a client that omits
 * `Accept: application/json` (curl, Postman, integrations) makes Laravel try
 * to redirect unauthenticated requests to a `login` route that an API-only
 * app does not have, which surfaces as a 500 instead of a 401.
 */
class ForceJsonResponse
{
    public function handle(Request $request, Closure $next): Response
    {
        $request->headers->set('Accept', 'application/json');

        return $next($request);
    }
}
