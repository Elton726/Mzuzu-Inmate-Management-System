<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cell;
use Illuminate\Http\Request;

class CellController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    public function available(Request $request)
    {
        $validated = $request->validate([
            'security_classification' => ['nullable', 'in:maximum,medium,minimum'],
        ]);

        $query = Cell::query()
            ->where('status', 'available')
            ->whereColumn('current_occupancy', '<', 'capacity');

        if (!empty($validated['security_classification'])) {
            $query->where('security_classification', $validated['security_classification']);
        }

        return response()->json($query->orderBy('block')->orderBy('cell_number')->get());
    }
}

