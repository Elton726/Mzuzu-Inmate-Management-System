<?php

namespace App\Modules\Visitation\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Visitation\Models\VisitItem;
use App\Modules\Visitation\Models\VisitItemFlagReview;
use App\Modules\Visitation\Models\VisitSession;
use App\Modules\Visitation\Requests\StoreVisitItemRequest;
use App\Modules\Visitation\Requests\UpdateVisitItemRequest;
use App\Modules\Visitation\Services\VisitSessionEventLogger;
use App\Modules\Visitation\Services\VisitationNotificationService;

class VisitItemController extends Controller
{
    public function store(
        VisitSession $session,
        StoreVisitItemRequest $request,
        VisitSessionEventLogger $events,
        VisitationNotificationService $notifications
    )
    {
        $item = $session->items()->create([
            'item_description' => $request->validated('item_description'),
            'status' => $request->validated('status') ?? 'pending',
            'notes' => $request->validated('notes'),
        ]);

        if ($item->status === 'flagged') {
            $session->update(['status' => 'flagged']);
            VisitItemFlagReview::query()->firstOrCreate(
                ['visit_item_id' => $item->id, 'status' => 'pending'],
                [
                    'visit_session_id' => $session->id,
                    'notes' => $item->notes,
                    'created_by' => $request->user()->id,
                ]
            );
            $notifications->forRole(
                'station_officer',
                'Flagged visitation item',
                "An item for {$session->visitor?->full_name} requires review.",
                'warning',
                '/visitation/flag-reviews',
                ['session_id' => $session->id, 'item_id' => $item->id]
            );
        }

        $events->log($session, 'item_added', 'Visit item recorded.', ['item_id' => $item->id, 'status' => $item->status], $request->user()->id);

        return response()->json(['data' => $item], 201);
    }

    public function update(
        VisitItem $item,
        UpdateVisitItemRequest $request,
        VisitSessionEventLogger $events,
        VisitationNotificationService $notifications
    )
    {
        $item->update($request->validated());
        $session = $item->session;

        if ($item->status === 'flagged') {
            $session->update(['status' => 'flagged']);
            VisitItemFlagReview::query()->firstOrCreate(
                ['visit_item_id' => $item->id, 'status' => 'pending'],
                [
                    'visit_session_id' => $session->id,
                    'notes' => $item->notes,
                    'created_by' => $request->user()->id,
                ]
            );
            $notifications->forRole(
                'station_officer',
                'Flagged visitation item',
                "An item for {$session->visitor?->full_name} requires review.",
                'warning',
                '/visitation/flag-reviews',
                ['session_id' => $session->id, 'item_id' => $item->id]
            );
        } elseif ($session && $session->status === 'flagged' && !$session->items()->where('status', 'flagged')->exists()) {
            $session->update(['status' => 'in_progress']);
        }

        $events->log($session, 'item_updated', 'Visit item status updated.', ['item_id' => $item->id, 'status' => $item->status], $request->user()->id);

        return response()->json(['data' => $item->fresh()]);
    }
}
