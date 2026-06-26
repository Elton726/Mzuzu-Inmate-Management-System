<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\ActivityLog;

class ActivityLogger
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // We only log if the user is authenticated and the request was successful (2xx)
        $user = $request->user();
        if ($user && $response->isSuccessful()) {
            $action = $this->determineAction($request);
            if ($action) {
                $roleName = $user->role_name ?? 'N/A';
                $displayRole = $this->roleDisplayName($roleName);

                ActivityLog::create([
                    'user_id' => $user->id,
                    'user_name' => $user->name,
                    'user_role' => $displayRole,
                    'action' => $action,
                    'ip_address' => $request->ip(),
                ]);
            }
        }

        return $response;
    }

    /**
     * Determine the user-friendly role display name.
     */
    private function roleDisplayName(string $role): string
    {
        return [
            'admin' => 'Administrator',
            'reception_officer' => 'Reception Officer',
            'officer_on_duty' => 'Officer on Duty',
            'gatekeeper' => 'Gate Keeper',
            'station_officer' => 'Station Officer',
        ][$role] ?? ucwords(str_replace('_', ' ', $role));
    }

    /**
     * Determine the action string based on route/request details.
     */
    private function determineAction(Request $request): ?string
    {
        $method = $request->method();
        $path = $request->path();
        
        // Remove 'api/' prefix if present
        $cleanPath = preg_replace('/^api\//', '', $path);
        
        // 1. User / Auth routes
        if (preg_match('/^register$/', $cleanPath) && $method === 'POST') {
            return 'created a new user';
        }
        if (preg_match('/^admin\/users$/', $cleanPath) && $method === 'POST') {
            return 'created a new user';
        }
        if (preg_match('/^admin\/users\/bulk-delete$/', $cleanPath) && $method === 'POST') {
            return 'bulk deleted users';
        }
        if (preg_match('/^admin\/users\/bulk-update-role$/', $cleanPath) && $method === 'POST') {
            return 'bulk updated user roles';
        }
        if (preg_match('/^admin\/users\/\d+$/', $cleanPath)) {
            if ($method === 'PUT' || $method === 'PATCH') return 'updated a user';
            if ($method === 'DELETE') return 'deleted a user';
        }
        if (preg_match('/^user\/profile$/', $cleanPath) && ($method === 'PUT' || $method === 'PATCH')) {
            return 'updated their user profile';
        }
        if (preg_match('/^user\/change-password$/', $cleanPath) && $method === 'POST') {
            return 'changed their password';
        }
        
        // 2. Cell routes
        if (preg_match('/^admin\/cells$/', $cleanPath) && $method === 'POST') {
            return 'created a cell';
        }
        if (preg_match('/^admin\/cells\/\d+$/', $cleanPath)) {
            if ($method === 'PUT' || $method === 'PATCH') return 'updated a cell';
            if ($method === 'DELETE') return 'deleted a cell';
        }

        // 3. Duty Roster routes
        if (preg_match('/^admin\/duty-rosters$/', $cleanPath) && $method === 'POST') {
            return 'assigned an officer to duty';
        }
        if (preg_match('/^admin\/duty-rosters\/auto-assign$/', $cleanPath) && $method === 'POST') {
            return 'auto-assigned officers to duty';
        }
        if (preg_match('/^admin\/duty-rosters\/\d+$/', $cleanPath)) {
            if ($method === 'PUT' || $method === 'PATCH') return 'updated a duty roster';
            if ($method === 'DELETE') return 'deleted a duty roster';
        }

        // 4. Activity Management routes
        if (preg_match('/^admin\/activities\/(internal|external)$/', $cleanPath) && $method === 'POST') {
            return 'created a new activity';
        }
        if (preg_match('/^admin\/activities\/\d+(\/external)?$/', $cleanPath)) {
            if ($method === 'PUT' || $method === 'PATCH') return 'updated an activity';
            if ($method === 'DELETE') return 'deleted an activity';
        }

        // 5. Inmate Admission routes
        if (preg_match('/^inmates$/', $cleanPath) && $method === 'POST') {
            return 'created an inmate record';
        }
        if (preg_match('/^admissions$/', $cleanPath) && $method === 'POST') {
            return 'admitted an inmate';
        }
        if (preg_match('/^admissions\/\d+\/sentence-length$/', $cleanPath) && $method === 'PUT') {
            return 'updated sentence length';
        }
        if (preg_match('/^documents$/', $cleanPath) && $method === 'POST') {
            return 'uploaded an inmate document';
        }

        // 6. Visitation routes
        if (preg_match('/^visitors$/', $cleanPath) && $method === 'POST') {
            return 'created a visitor';
        }
        if (preg_match('/^visitors\/\d+\/approve$/', $cleanPath) && ($method === 'PUT' || $method === 'PATCH')) {
            return 'approved a visitor';
        }
        if (preg_match('/^visitors\/\d+$/', $cleanPath)) {
            if ($method === 'PUT' || $method === 'PATCH') return 'updated a visitor';
            if ($method === 'DELETE') return 'deleted a visitor';
        }
        if (preg_match('/^inmate-visitor-registrations$/', $cleanPath) && $method === 'POST') {
            return 'registered an inmate visitor';
        }
        if (preg_match('/^inmate-visitor-registrations\/\d+$/', $cleanPath) && $method === 'DELETE') {
            return 'removed an inmate visitor';
        }
        if (preg_match('/^visitation-sessions$/', $cleanPath) && $method === 'POST') {
            return 'created a visitation session';
        }
        if (preg_match('/^visitation-sessions\/\d+\/check-in$/', $cleanPath) && ($method === 'PUT' || $method === 'PATCH')) {
            return 'checked in a visitation session';
        }
        if (preg_match('/^visitation-sessions\/\d+\/check-out$/', $cleanPath) && ($method === 'PUT' || $method === 'PATCH')) {
            return 'checked out a visitation session';
        }
        if (preg_match('/^visitation-sessions\/\d+\/cancel$/', $cleanPath) && ($method === 'PUT' || $method === 'PATCH')) {
            return 'cancelled a visitation session';
        }
        if (preg_match('/^visitation-sessions\/\d+\/deny$/', $cleanPath) && $method === 'POST') {
            return 'denied a visitation session';
        }
        if (preg_match('/^visitation-items$/', $cleanPath) && $method === 'POST') {
            return 'recorded a visitation item';
        }
        if (preg_match('/^visitation-items\/\d+\/inspect$/', $cleanPath) && ($method === 'PUT' || $method === 'PATCH')) {
            return 'inspected a visitation item';
        }
        if (preg_match('/^visitation-rules$/', $cleanPath) && $method === 'POST') {
            return 'created a visitation rule';
        }
        if (preg_match('/^visitation-rules\/\d+$/', $cleanPath)) {
            if ($method === 'PUT' || $method === 'PATCH') return 'updated a visitation rule';
            if ($method === 'DELETE') return 'deleted a visitation rule';
        }

        // 7. Release routes
        if (preg_match('/^releases\/approve$/', $cleanPath) && $method === 'POST') {
            return 'approved an inmate release';
        }
        if (preg_match('/^releases\/\d+$/', $cleanPath) && $method === 'DELETE') {
            return 'deleted release approval';
        }
        if (preg_match('/^releases\/\d+\/confirm$/', $cleanPath) && ($method === 'PUT' || $method === 'PATCH')) {
            return 'scanned an inmate out';
        }
        if (preg_match('/^(admissions\/\d+|adjustments)\/adjustments$/', $cleanPath) && $method === 'POST') {
            return 'adjusted sentence length';
        }
        if (preg_match('/^adjustments$/', $cleanPath) && $method === 'POST') {
            return 'adjusted sentence length';
        }
        if (preg_match('/^adjustments\/\d+$/', $cleanPath) && $method === 'DELETE') {
            return 'deleted a sentence adjustment';
        }

        // 8. Officer Session / Attendance routes
        if (preg_match('/^officer\/activity-sessions$/', $cleanPath)) {
            if ($method === 'POST') return 'created an activity session';
            if ($method === 'PUT' || $method === 'PATCH') return 'updated an activity session';
            if ($method === 'DELETE') return 'deleted an activity session';
        }
        if (preg_match('/^officer\/activity-sessions\/\d+$/', $cleanPath)) {
            if ($method === 'PUT' || $method === 'PATCH') return 'updated an activity session';
            if ($method === 'DELETE') return 'deleted an activity session';
        }
        if (preg_match('/^officer\/activity-sessions\/daily$/', $cleanPath) && $method === 'POST') {
            return 'created a daily activity session';
        }
        if (preg_match('/^officer\/activity-sessions\/external-once$/', $cleanPath) && $method === 'POST') {
            return 'created an external activity session';
        }
        if (preg_match('/^officer\/activity-sessions\/\d+\/attendance$/', $cleanPath) && $method === 'POST') {
            return 'recorded attendance';
        }
        if (preg_match('/^officer\/activities\/\d+\/allocations\/(manual|auto)$/', $cleanPath) && $method === 'POST') {
            return 'allocated inmates to activity';
        }
        if (preg_match('/^sessions$/', $cleanPath)) {
            if ($method === 'POST') return 'created an activity session';
        }
        if (preg_match('/^sessions\/\d+$/', $cleanPath)) {
            if ($method === 'PUT' || $method === 'PATCH') return 'updated an activity session';
            if ($method === 'DELETE') return 'deleted an activity session';
        }
        if (preg_match('/^attendance$/', $cleanPath) && $method === 'POST') {
            return 'recorded attendance';
        }
        if (preg_match('/^attendance\/\d+$/', $cleanPath) && ($method === 'PUT' || $method === 'PATCH')) {
            return 'updated attendance';
        }

        return null;
    }
}
