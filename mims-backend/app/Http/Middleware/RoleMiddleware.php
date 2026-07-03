<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        if (!$request->user()) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        if ($request->user()->is_active === false) {
            return response()->json(['message' => 'Forbidden. Account is inactive.'], 403);
        }

        $hasAllowedRole = collect($roles)->contains(
            fn (string $role): bool => $request->user()->hasRole($role)
        );

        if (!$hasAllowedRole) {
            return response()->json(['message' => 'Forbidden. You do not have access to this resource.'], 403);
        }

        return $next($request);
    }
}
