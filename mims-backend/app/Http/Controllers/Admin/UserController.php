<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    /**
     * Display a listing of all users with optional filtering.
     */
    public function index(Request $request)
    {
        // Admin-only access is enforced by middleware
        $query = User::query();

        // Search by name or email
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
        }

        // Filter by role
        if ($request->has('role')) {
            $query->where('role', $request->input('role'));
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = $request->input('per_page', 50);
        $users = $query->paginate($perPage);

        return response()->json($users);
    }

    /**
     * Store a newly created user.
     */
    public function store(Request $request)
    {
        // Admin-only access is enforced by middleware
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'confirmed', Password::defaults()],
            'role' => ['required', 'in:admin,reception_officer,station_officer,officer_on_duty,gatekeeper'],
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role,
        ]);

        return response()->json([
            'message' => 'User created successfully',
            'user' => $user,
        ], 201);
    }

    /**
     * Display the specified user.
     */
    public function show(User $user)
    {
        // Admin-only access is enforced by middleware
        return response()->json($user);
    }

    /**
     * Update the specified user.
     */
    public function update(Request $request, User $user)
    {
        // Admin-only access is enforced by middleware
        // Prevent admin from updating themselves through bulk operations
        $authUser = Auth::user();

        $rules = [
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'string', 'email', 'max:255', 'unique:users,email,' . $user->id],
            'password' => ['sometimes', 'confirmed', Password::defaults()],
            'role' => ['sometimes', 'in:admin,reception_officer,station_officer,officer_on_duty,gatekeeper'],
        ];

        $validated = $request->validate($rules);

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        $user->update($validated);

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $user,
        ]);
    }

    /**
     * Remove the specified user.
     */
    public function destroy(User $user)
    {
        // Admin-only access is enforced by middleware
        $authUser = Auth::user();

        // Prevent deleting self
        if ($user->id === $authUser->id) {
            return response()->json([
                'message' => 'You cannot delete your own account.',
            ], 400);
        }

        $user->delete();

        return response()->json([
            'message' => 'User deleted successfully',
        ], 204);
    }

    /**
     * Get user statistics.
     */
    public function statistics()
    {
        // Admin-only access is enforced by middleware
        $stats = [
            'total_users' => User::count(),
            'by_role' => User::selectRaw('role, COUNT(*) as count')
                ->groupBy('role')
                ->get()
                ->pluck('count', 'role'),
            'recent_users' => User::latest()->limit(10)->get(['id', 'name', 'email', 'role', 'created_at']),
        ];

        return response()->json($stats);
    }

    /**
     * Bulk delete users.
     */
    public function bulkDelete(Request $request)
    {
        // Admin-only access is enforced by middleware
        $request->validate([
            'user_ids' => ['required', 'array', 'min:1'],
            'user_ids.*' => ['integer', 'exists:users,id'],
        ]);

        $authUser = Auth::user();
        $userIds = $request->user_ids;

        // Prevent deleting self
        if (in_array($authUser->id, $userIds)) {
            return response()->json([
                'message' => 'You cannot delete your own account.',
            ], 400);
        }

        $deletedCount = User::whereIn('id', $userIds)->delete();

        return response()->json([
            'message' => "{$deletedCount} user(s) deleted successfully",
            'deleted_count' => $deletedCount,
        ]);
    }

    /**
     * Bulk update user roles.
     */
    public function bulkUpdateRole(Request $request)
    {
        // Admin-only access is enforced by middleware
        $request->validate([
            'user_ids' => ['required', 'array', 'min:1'],
            'user_ids.*' => ['integer', 'exists:users,id'],
            'role' => ['required', 'in:admin,reception_officer,station_officer,officer_on_duty,gatekeeper'],
        ]);

        $authUser = Auth::user();
        $userIds = $request->user_ids;

        // Prevent changing own role
        if (in_array($authUser->id, $userIds)) {
            return response()->json([
                'message' => 'You cannot change your own role.',
            ], 400);
        }

        $updatedCount = User::whereIn('id', $userIds)->update(['role' => $request->role]);

        return response()->json([
            'message' => "{$updatedCount} user(s) updated successfully",
            'updated_count' => $updatedCount,
        ]);
    }
}
