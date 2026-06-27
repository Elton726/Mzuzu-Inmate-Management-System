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

        if ($item->status === 'flagged') {
            $session->update(['status' => 'flagged']);
        }

        return response()->json(['data' => $item], 201);
    }

    public function update(VisitItem $item, UpdateVisitItemRequest $request)
    {
        $item->update($request->validated());
        $session = $item->session;

        if ($item->status === 'flagged') {
            $session->update(['status' => 'flagged']);
        } elseif ($session && $session->status === 'flagged' && !$session->items()->where('status', 'flagged')->exists()) {
            $session->update(['status' => 'in_progress']);
        }

        return response()->json(['data' => $item->fresh()]);
    }
}
