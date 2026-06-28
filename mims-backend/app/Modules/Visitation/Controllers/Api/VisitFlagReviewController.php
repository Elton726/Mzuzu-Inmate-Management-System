<?php

namespace App\Modules\Visitation\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Visitation\Models\VisitItemFlagReview;
use App\Modules\Visitation\Services\VisitSessionEventLogger;
use Illuminate\Http\Request;

class VisitFlagReviewController extends Controller
{
    public function index()
    {
        $reviews = VisitItemFlagReview::query()
            ->with(['item', 'session.visitor', 'session.inmate', 'reviewer'])
            ->where('status', 'pending')
            ->latest()
            ->get();

        return response()->json(['data' => $reviews]);
    }

    public function resolve(
        VisitItemFlagReview $review,
        Request $request,
        VisitSessionEventLogger $events
    ) {
        $data = $request->validate([
            'resolution' => ['required', 'string', 'in:approved,confiscated,denied,other'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $review->update([
            'status' => 'resolved',
            'resolution' => $data['resolution'],
            'notes' => $data['notes'] ?? null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        $item = $review->item;
        $session = $review->session;

        if ($data['resolution'] === 'approved') {
            $item->update(['status' => 'approved', 'notes' => $data['notes'] ?? $item->notes]);

            if (! $session->items()->where('status', 'flagged')->exists()) {
                $session->update(['status' => 'in_progress']);
            }
        }

        $events->log(
            $session,
            'flag_resolved',
            'Flagged item review resolved.',
            ['item_id' => $item->id, 'resolution' => $data['resolution']],
            $request->user()->id
        );

        return response()->json(['data' => $review->fresh(['item', 'session.visitor', 'reviewer'])]);
    }
}
