<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    /**
     * Display the authenticated user's profile.
     */
    public function me(Request $request)
    {
        return response()->json($this->userPayload($request->user()));
    }

    /**
     * Display the specified user profile.
     * Users can only view their own profile.
     */
    public function show(User $user)
    {
        $authUser = Auth::user();

        // Users can only view their own profile
        if ($user->id !== $authUser->id) {
            return response()->json([
                'message' => 'Forbidden. You can only view your own profile.',
            ], 403);
        }

        return response()->json($this->userPayload($user));
    }

    /**
     * Update the authenticated user's own profile.
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'string', 'email', 'max:255', 'unique:users,email,' . $user->id],
            'password' => ['sometimes', 'confirmed', Password::defaults()],
        ]);

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        $user->update($validated);

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $this->userPayload($user),
        ]);
    }

    /**
     * Change the authenticated user's password.
     */
    public function changePassword(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        // Verify current password
        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'message' => 'Current password is incorrect.',
            ], 422);
        }

        $user->update([
            'password' => Hash::make($request->password),
        ]);

        return response()->json([
            'message' => 'Password changed successfully',
        ]);
    }

    private function userPayload(User $user): array
    {
        $user->loadMissing('role');
        $payload = $user->toArray();
        $payload['role_name'] = $user->effective_role_name;
        $payload['actual_role_name'] = $user->role?->name ?? $user->getAttribute('role');

        return $payload;
    }
}
