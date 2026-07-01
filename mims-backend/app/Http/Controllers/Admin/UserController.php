<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Role;
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
        $query = User::query()->with('role');

        // Search by name or email
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
        }

        // Filter by role
        if ($request->has('role')) {
            $roleName = $request->input('role');
            $query->whereHas('role', fn ($q) => $q->where('name', $roleName));
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
            // 'officer_on_duty' is not assignable manually.
            'role' => ['required', 'in:admin,reception_officer,station_officer,staff_officer,gatekeeper'],
        ]);

        // Never allow manual assignment of officer_on_duty.
        if ($request->role === 'officer_on_duty') {
            return response()->json([
                'message' => "'officer_on_duty' cannot be assigned manually; it is managed by the duty roster rotation.",
            ], 422);
        }

        $role = Role::firstOrCreate(['name' => $request->role], ['description' => null]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role_id' => $role->id,
        ]);

        return response()->json([
            'message' => 'User created successfully',
            'user' => $user->load('role'),
        ], 201);
    }

    /**
     * Display the specified user.
     */
    public function show(User $user)
    {
        // Admin-only access is enforced by middleware
        return response()->json($user->load('role'));
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
            // 'officer_on_duty' is not assignable manually.
            'role' => ['sometimes', 'in:admin,reception_officer,station_officer,staff_officer,gatekeeper'],
        ];

        $validated = $request->validate($rules);

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        if (isset($validated['role'])) {
            $role = Role::firstOrCreate(['name' => $validated['role']], ['description' => null]);
            unset($validated['role']);
            $validated['role_id'] = $role->id;
        }

        // Never allow manual assignment of officer_on_duty.
        if (isset($validated['role_id'])) {
            $roleName = Role::query()->where('id', $validated['role_id'])->value('name');
            if ($roleName === 'officer_on_duty') {
                return response()->json([
                    'message' => "'officer_on_duty' cannot be assigned manually; it is managed by the duty roster rotation.",
                ], 422);
            }
        }

        $user->update($validated);

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $user->fresh()->load('role'),
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
            'by_role' => User::query()
                ->join('roles', 'users.role_id', '=', 'roles.id')
                ->selectRaw('roles.name as role, COUNT(*) as count')
                ->groupBy('roles.name')
                ->get()
                ->pluck('count', 'role'),
            'recent_users' => User::with('role')->latest()->limit(10)->get(['id', 'name', 'email', 'role_id', 'created_at']),
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
            // 'officer_on_duty' is not assignable manually.
            'role' => ['required', 'in:admin,reception_officer,station_officer,staff_officer,gatekeeper'],
        ]);

        $authUser = Auth::user();
        $userIds = $request->user_ids;

        // Prevent changing own role
        if (in_array($authUser->id, $userIds)) {
            return response()->json([
                'message' => 'You cannot change your own role.',
            ], 400);
        }

        $role = Role::firstOrCreate(['name' => $request->role], ['description' => null]);
        $updatedCount = User::whereIn('id', $userIds)->update(['role_id' => $role->id]);

        return response()->json([
            'message' => "{$updatedCount} user(s) updated successfully",
            'updated_count' => $updatedCount,
        ]);
    }
}
