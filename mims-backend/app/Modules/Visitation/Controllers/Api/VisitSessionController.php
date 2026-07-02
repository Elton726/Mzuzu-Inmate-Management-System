<?php

namespace App\Modules\Visitation\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Admissions\Models\Inmate;
use App\Modules\Visitation\Models\CharityBooking;
use App\Modules\Visitation\Models\VisitItemFlagReview;
use App\Modules\Visitation\Models\Visitor;
use App\Modules\Visitation\Models\VisitorInmateRelationship;
use App\Modules\Visitation\Models\VisitSession;
use App\Modules\Visitation\Requests\DenyVisitSessionRequest;
use App\Modules\Visitation\Requests\StoreVisitSessionRequest;
use App\Modules\Visitation\Services\InmateVisitEligibilityChecker;
use App\Modules\Visitation\Services\VisitSessionEventLogger;
use App\Modules\Visitation\Services\VisitSlotChecker;
use App\Modules\Visitation\Services\VisitationNotificationService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class VisitSessionController extends Controller
{
    public function store(
        StoreVisitSessionRequest $request,
        InmateVisitEligibilityChecker $eligibility,
        VisitSlotChecker $slotChecker,
        VisitSessionEventLogger $events,
        VisitationNotificationService $notifications
    ) {
        $data = $request->validated();
        $inmate = null;

        $booking = null;
        if (!empty($data['charity_booking_id'])) {
            $booking = CharityBooking::whereKey($data['charity_booking_id'])
                ->where('status', 'approved')
                ->firstOrFail();

            if ($booking->visit_session_id) {
                throw ValidationException::withMessages([
                    'charity_booking_id' => ['This charity visit request already has a visit session.'],
                ]);
            }

            $visitDate = Carbon::parse($booking->proposed_date)->startOfDay();
            $validUntil = (clone $visitDate)->addDays(7)->endOfDay();
            $today = now();

            if ($today->lt($visitDate)) {
                throw ValidationException::withMessages([
                    'charity_booking_id' => ['This charity visit can only start on the proposed visit date.'],
                ]);
            }

            if ($today->gt($validUntil)) {
                throw ValidationException::withMessages([
                    'charity_booking_id' => ['This charity visit request is overdue and no longer valid.'],
                ]);
            }
        } else {
            $inmate = Inmate::findOrFail($data['inmate_id']);
            $eligibility->ensureEligible($inmate);
            $slotChecker->ensureAvailable($inmate->id, now()->toDateString(), now()->format('H:i'), 60);
        }

        $session = DB::transaction(function () use ($data, $request, $booking, $slotChecker, $eligibility, $events, $notifications) {
            $items = collect($data['items'] ?? []);

            $visitTime = now()->toDateString();
            $visitClock = now()->format('H:i');
            $durationMinutes = \App\Modules\Visitation\Models\VisitationRule::intValue('regular_visit_duration') ?: 60;

            // For regular visits, re-validate slot availability inside the transaction.
            // Additionally, lock competing rows for this inmate to reduce race conditions.
            if (!$booking) {
                $inmate = Inmate::query()->whereKey($data['inmate_id'])->lockForUpdate()->firstOrFail();
                $eligibility->ensureEligible($inmate);

                // Lock any existing active sessions for this inmate.
                // This prevents two concurrent requests from creating overlapping sessions.
                // NOTE: We lock sessions that are effectively "active" (have a checked_in_at).
                VisitSession::query()
                    ->where('inmate_id', $inmate->id)
                    ->whereNotNull('checked_in_at')
                    ->whereIn('status', ['in_progress', 'checked_in', 'flagged'])
                    ->lockForUpdate()
                    ->get();

                $slotChecker->ensureAvailable($inmate->id, $visitTime, $visitClock, $durationMinutes);
            }

            $visitor = $booking
                ? Visitor::create([
                    'full_name' => $booking->organisation_name,
                    'phone' => $booking->contact_person_phone,
                ])
                : Visitor::query()->find($data['visitor_id'] ?? null);

            if (! $visitor) {
                $visitor = Visitor::create([
                    'full_name' => $data['full_name'],
                    'phone' => $data['phone'] ?? null,
                ]);
            } else {
                $visitor->update([
                    'full_name' => $data['full_name'] ?? $visitor->full_name,
                    'phone' => array_key_exists('phone', $data) ? $data['phone'] : $visitor->phone,
                ]);
            }

            $session = VisitSession::create([
                'visitor_id' => $visitor->id,
                'inmate_id' => $booking ? null : $data['inmate_id'],
                'visit_type' => $booking ? 'charity' : ($data['visit_type'] ?? 'regular'),
                'status' => $visitor->is_watchlisted || $items->contains(fn ($item) => ($item['status'] ?? null) === 'flagged') ? 'flagged' : 'in_progress',
                'checked_in_at' => now(),
                'expected_checkout_at' => now()->addMinutes($booking ? (int) $booking->duration_minutes : $durationMinutes),
                'created_by' => $request->user()->id,
            ]);

            $items->each(function ($item) use ($session) {
                $createdItem = $session->items()->create([
                    'item_description' => $item['item_description'],
                    'status' => $item['status'],
                    'notes' => $item['notes'] ?? null,
                ]);

                if (($createdItem->status ?? null) === 'flagged') {
                    $session->update(['status' => 'flagged']);
                    VisitItemFlagReview::query()->create([
                        'visit_item_id' => $createdItem->id,
                        'visit_session_id' => $session->id,
                        'status' => 'pending',
                        'notes' => $createdItem->notes,
                        'created_by' => $session->created_by,
                    ]);
                }
            });

            if ($booking) {
                $booking->update(['visit_session_id' => $session->id]);
            } else {
                VisitorInmateRelationship::query()->updateOrCreate(
                    ['visitor_id' => $visitor->id, 'inmate_id' => $data['inmate_id']],
                    [
                        'relationship_type' => $data['relationship_type'] ?? 'unspecified',
                        'notes' => $data['relationship_notes'] ?? null,
                    ]
                );
            }

            $events->log(
                $session,
                'checked_in',
                $booking ? 'Approved charity visit session started.' : 'Regular visit checked in.',
                ['watchlisted_visitor' => (bool) $visitor->is_watchlisted],
                $request->user()->id
            );

            if ($visitor->is_watchlisted || $session->status === 'flagged') {
                $notifications->forRole(
                    'station_officer',
                    'Visitation security review required',
                    "{$visitor->full_name} has a flagged visit that requires review.",
                    'warning',
                    '/visitation/flag-reviews',
                    ['session_id' => $session->id]
                );
            }

            return $session->load(['visitor.watchlistedBy', 'inmate', 'items.flagReviews', 'charityBooking', 'events']);
        });

        return response()->json(['data' => $session], 201);
    }

    public function checkIn(VisitSession $session, VisitSessionEventLogger $events)
    {
        if ($session->checked_in_at) {
            return response()->json(['data' => $session->load(['visitor', 'inmate', 'items'])]);
        }

        $session->update([
            'status' => 'in_progress',
            'checked_in_at' => now(),
            'expected_checkout_at' => now()->addMinutes((int) ($session->charityBooking?->duration_minutes ?? \App\Modules\Visitation\Models\VisitationRule::intValue('regular_visit_duration') ?: 60)),
        ]);

        $events->log($session, 'checked_in', 'Visit checked in.', null, request()->user()->id);

        return response()->json(['data' => $session->load(['visitor', 'inmate', 'items', 'events'])]);
    }

    public function checkOut(VisitSession $session, VisitSessionEventLogger $events)
    {
        if ($session->status === 'flagged' || $session->items()->where('status', 'flagged')->exists()) {
            throw ValidationException::withMessages([
                'session' => ['Flagged visits cannot be checked out until the flag is resolved.'],
            ]);
        }

        $session->update([
            'status' => 'completed',
            'checked_out_at' => now(),
        ]);

        $events->log($session, 'checked_out', 'Visit checked out.', null, request()->user()->id);

        return response()->json(['data' => $session->load(['visitor', 'inmate', 'items', 'events'])]);
    }

    public function deny(VisitSession $session, DenyVisitSessionRequest $request, VisitSessionEventLogger $events)
    {
        $session->update([
            'status' => 'denied',
            'denial_reason' => $request->validated('denial_reason'),
            'denial_notes' => $request->validated('denial_notes'),
            'checked_out_at' => now(),
        ]);

        $events->log($session, 'denied', 'Visit denied.', $request->validated(), $request->user()->id);

        return response()->json(['data' => $session->load(['visitor', 'inmate', 'items', 'events'])]);
    }

    public function cancel(VisitSession $session, Request $request, VisitSessionEventLogger $events)
    {
        $validated = $request->validate([
            'denial_reason' => ['nullable', 'string', 'max:255'],
            'denial_notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $session->update([
            'status' => 'cancelled',
            'denial_reason' => $validated['denial_reason'] ?? 'Cancelled',
            'denial_notes' => $validated['denial_notes'] ?? null,
            'checked_out_at' => now(),
        ]);

        $events->log($session, 'cancelled', 'Visit cancelled.', $validated, $request->user()->id);

        return response()->json(['data' => $session->load(['visitor', 'inmate', 'items', 'events'])]);
    }

    public function validateSlot(Request $request, InmateVisitEligibilityChecker $eligibility, VisitSlotChecker $slotChecker)
    {
        $data = $request->validate([
            'inmate_id' => ['required', 'integer', 'exists:inmates,id'],
            'date' => ['required', 'date'],
            'time' => ['required', 'date_format:H:i'],
            'duration_minutes' => ['nullable', 'integer', 'min:15', 'max:480'],
        ]);

        $inmate = Inmate::findOrFail($data['inmate_id']);
        $eligibilityResult = $eligibility->check($inmate);
        $conflict = $slotChecker->hasConflict(
            $inmate->id,
            $data['date'],
            $data['time'],
            $data['duration_minutes'] ?? \App\Modules\Visitation\Models\VisitationRule::intValue('regular_visit_duration') ?: 60
        );

        return response()->json([
            'eligible' => $eligibilityResult['eligible'],
            'eligibility_reason' => $eligibilityResult['reason'],
            'conflict' => $conflict,
            'available' => $eligibilityResult['eligible'] && !$conflict,
        ]);
    }
}
