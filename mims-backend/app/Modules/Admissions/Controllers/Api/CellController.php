<?php

namespace App\Modules\Admissions\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Admissions\Models\Cell;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CellController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    public function index(Request $request)
    {
        $validated = $request->validate([
            'security_classification' => ['nullable', 'in:maximum,medium,minimum'],
            'gender' => ['nullable', 'in:male,female'],
        ]);

        $query = Cell::query();

        if (!empty($validated['security_classification'])) {
            $query->where('security_classification', $validated['security_classification']);
        }

        if (!empty($validated['gender'])) {
            $query->where('gender', $validated['gender']);
        }

        return response()->json($query->orderBy('block')->orderBy('cell_number')->get());
    }

    public function available(Request $request)
    {
        $validated = $request->validate([
            'security_classification' => ['nullable', 'in:maximum,medium,minimum'],
            'gender' => ['nullable', 'in:male,female'],
        ]);

        $query = Cell::query()
            ->where('status', 'available')
            ->whereColumn('current_occupancy', '<', 'capacity');

        if (!empty($validated['security_classification'])) {
            $query->where('security_classification', $validated['security_classification']);
        }

        if (!empty($validated['gender'])) {
            $query->where('gender', $validated['gender']);
        }

        return response()->json($query->orderBy('block')->orderBy('cell_number')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'cell_number' => ['required', 'string', 'max:20', 'unique:cells,cell_number'],
            'block' => ['required', 'string', 'max:10'],
            'gender' => ['required', 'in:male,female'],
            'security_classification' => ['required', 'in:maximum,medium,minimum'],
            'capacity' => ['required', 'integer', 'min:1', 'max:1000'],
            'status' => ['nullable', 'in:available,full,maintenance'],
        ]);

        $cell = Cell::create([
            ...$validated,
            'current_occupancy' => 0,
            'status' => $validated['status'] ?? 'available',
        ]);

        return response()->json($cell, 201);
    }

    public function update(Request $request, Cell $cell)
    {
        $validated = $request->validate([
            'cell_number' => ['required', 'string', 'max:20', Rule::unique('cells', 'cell_number')->ignore($cell->id)],
            'block' => ['required', 'string', 'max:10'],
            'gender' => ['required', 'in:male,female'],
            'security_classification' => ['required', 'in:maximum,medium,minimum'],
            'capacity' => ['required', 'integer', 'min:' . max(1, (int) $cell->current_occupancy), 'max:1000'],
            'status' => ['required', 'in:available,full,maintenance'],
        ]);

        $cell->update($validated);

        return response()->json($cell->fresh());
    }

    public function destroy(Cell $cell)
    {
        if ($cell->current_occupancy > 0 || $cell->allocations()->exists()) {
            return response()->json([
                'message' => 'Cells with occupancy or allocation history cannot be deleted.',
            ], 422);
        }

        $cell->delete();

        return response()->noContent();
    }
}
