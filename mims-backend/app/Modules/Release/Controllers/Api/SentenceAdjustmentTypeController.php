<?php

namespace App\Modules\Release\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Release\Models\SentenceAdjustmentType;
use App\Modules\Release\Requests\StoreSentenceAdjustmentTypeRequest;
use App\Modules\Release\Requests\UpdateSentenceAdjustmentTypeRequest;
use Illuminate\Http\Request;

class SentenceAdjustmentTypeController extends Controller
{
    public function index()
    {
        $types = SentenceAdjustmentType::query()
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $types]);
    }

    public function availableTypes()
    {
        $types = SentenceAdjustmentType::activeTypes();

        return response()->json(['data' => $types]);
    }

    public function store(StoreSentenceAdjustmentTypeRequest $request)
    {
        $type = SentenceAdjustmentType::query()->create($request->validated());

        return response()->json([
            'message' => 'Sentence adjustment type created successfully',
            'data' => $type,
        ], 201);
    }

    public function show(int $id)
    {
        $type = SentenceAdjustmentType::query()->findOrFail($id);

        return response()->json(['data' => $type]);
    }

    public function update(UpdateSentenceAdjustmentTypeRequest $request, int $id)
    {
        $type = SentenceAdjustmentType::query()->findOrFail($id);
        $type->update($request->validated());

        return response()->json([
            'message' => 'Sentence adjustment type updated successfully',
            'data' => $type,
        ]);
    }

    public function destroy(int $id)
    {
        $type = SentenceAdjustmentType::query()->findOrFail($id);
        $type->delete();

        return response()->json(null, 204);
    }
}
