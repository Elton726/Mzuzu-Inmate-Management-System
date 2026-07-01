<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::with('role')->where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'The provided credentials are incorrect.',
            ], 401);
        }

        if ($user->is_active === false) {
            return response()->json([
                'message' => 'Account is inactive.',
            ], 403);
        }

        $user->forceFill(['last_login' => now()])->save();

        if ($user->isAdmin()) {
            try {
                app(\App\Modules\ActivityAllocation\Services\Admin\OfficerDutyService::class)
                    ->ensureCurrentWeekAssignment((int) $user->id);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error("Weekly officer duty assignment failed: " . $e->getMessage());
            }
        }

        // Perform daily auto assignment if officer_on_duty and not already run today
        if ($user->role?->name === 'officer_on_duty') {
            $cacheKey = 'auto_assignment_run_' . now()->toDateString();
            if (!\Illuminate\Support\Facades\Cache::has($cacheKey)) {
                try {
                    $internalService = app(\App\Modules\ActivityAllocation\Services\Officer\InternalActivityAutoAssignService::class);
                    $externalService = app(\App\Modules\ActivityAllocation\Services\Officer\ExternalActivityAllocationService::class);
                    $activeActivities = \App\Modules\Admissions\Models\Activity::where('is_active', true)->get();
                    foreach ($activeActivities as $activity) {
                        try {
                            if ($activity->activity_type === 'internal') {
                                $slots = $activity->max_participants ?? 5;
                                $internalService->autoAssignRotating((int) $activity->id, (int) $slots, (int) $user->id);
                            } elseif ($activity->activity_type === 'external') {
                                $externalService->autoAllocate((int) $activity->id, (int) $user->id);
                            }
                        } catch (\Throwable $e) {
                            \Illuminate\Support\Facades\Log::error("Daily auto-assign failed for activity {$activity->id}: " . $e->getMessage());
                        }
                    }
                    \Illuminate\Support\Facades\Cache::put($cacheKey, true, now()->endOfDay());
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::error("Daily auto-assign overall wrapper failed: " . $e->getMessage());
                }
            }
        }

        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->noContent();
    }

    public function register(Request $request)
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:'.User::class],
            'password' => ['required', 'confirmed', Password::defaults()],
            'role' => ['required', 'in:admin,reception_officer,station_officer,officer_on_duty,gatekeeper'],
        ]);

        $role = Role::firstOrCreate(['name' => $request->role], ['description' => null]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role_id' => $role->id,
        ]);

        return response()->json($user->load('role'), 201);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }
}
