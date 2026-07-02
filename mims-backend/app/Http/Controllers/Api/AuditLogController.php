<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    public function index(Request $request)
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'table_name' => ['nullable', 'string', 'max:50'],
            'user_id' => ['nullable', 'integer'],
        ]);

        $query = AuditLog::query()
            ->with('user:id,name,email')
            ->orderByDesc('id');

        if (!empty($validated['q'])) {
            $search = $validated['q'];
            $query->where(function ($subQuery) use ($search) {
                $subQuery
                    ->where('action', 'like', "%{$search}%")
                    ->orWhere('table_name', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery
                            ->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });

                if (is_numeric($search)) {
                    $subQuery->orWhere('record_id', (int) $search);
                }
            });
        }

        if (!empty($validated['table_name'])) {
            $query->where('table_name', $validated['table_name']);
        }

        if (!empty($validated['user_id'])) {
            $query->where('user_id', $validated['user_id']);
        }

        return response()->json($query->paginate(50));
    }
}
