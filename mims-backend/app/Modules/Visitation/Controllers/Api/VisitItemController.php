<?php

namespace App\Modules\Visitation\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Visitation\Models\VisitItem;
use App\Modules\Visitation\Models\VisitSession;
use App\Modules\Visitation\Requests\StoreVisitItemRequest;
use App\Modules\Visitation\Requests\UpdateVisitItemRequest;

class VisitItemController extends Controller
{
    public function store(VisitSession $session, StoreVisitItemRequest $request)
    {
        $item = $session->items()->create([
            'item_description' => $request->validated('item_description'),
            'status' => $request->validated('status') ?? 'pending',
            'notes' => $request->validated('notes'),
        ]);

        return response()->json(['data' => $item], 201);
    }

    public function update(VisitItem $item, UpdateVisitItemRequest $request)
    {
        $item->update($request->validated());

        return response()->json(['data' => $item->fresh()]);
    }
}
