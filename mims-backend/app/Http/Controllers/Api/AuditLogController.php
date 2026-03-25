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
            'table_name' => ['nullable', 'string', 'max:50'],
            'user_id' => ['nullable', 'integer'],
        ]);

        $query = AuditLog::query()->orderByDesc('id');

        if (!empty($validated['table_name'])) {
            $query->where('table_name', $validated['table_name']);
        }

        if (!empty($validated['user_id'])) {
            $query->where('user_id', $validated['user_id']);
        }

        return response()->json($query->paginate(50));
    }
}

