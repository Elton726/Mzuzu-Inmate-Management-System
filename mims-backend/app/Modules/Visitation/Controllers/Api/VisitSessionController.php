<?php

namespace App\Modules\Visitation\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Admissions\Models\Inmate;
use App\Modules\Visitation\Models\CharityBooking;
use App\Modules\Visitation\Models\Visitor;
use App\Modules\Visitation\Models\VisitSession;
use App\Modules\Visitation\Requests\DenyVisitSessionRequest;
use App\Modules\Visitation\Requests\StoreVisitSessionRequest;
use App\Modules\Visitation\Services\InmateVisitEligibilityChecker;
use App\Modules\Visitation\Services\VisitSlotChecker;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class VisitSessionController extends Controller
{
    public function store(
        StoreVisitSessionRequest $request,
        InmateVisitEligibilityChecker $eligibility,
        VisitSlotChecker $slotChecker
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

        $session = DB::transaction(function () use ($data, $request, $booking) {
            $visitor = Visitor::create([
                'full_name' => $booking ? $booking->organisation_name : $data['full_name'],
                'id_type' => $booking ? 'Organisation' : $data['id_type'],
                'id_number' => $booking ? strtoupper(substr($booking->id, 0, 8)) : $data['id_number'],
                'phone' => $booking ? $booking->contact_person_phone : ($data['phone'] ?? null),
            ]);

            $session = VisitSession::create([
                'visitor_id' => $visitor->id,
                'inmate_id' => $booking ? null : $data['inmate_id'],
                'visit_type' => $booking ? 'charity' : ($data['visit_type'] ?? 'regular'),
                'status' => 'checked_in',
                'created_by' => $request->user()->id,
            ]);

            if ($booking) {
                $booking->update(['visit_session_id' => $session->id]);
            }

            return $session->load(['visitor', 'inmate', 'items', 'charityBooking']);
        });

        return response()->json(['data' => $session], 201);
    }

    public function checkIn(VisitSession $session)
    {
        if ($session->checked_in_at) {
            return response()->json(['data' => $session->load(['visitor', 'inmate', 'items'])]);
        }

        $session->update([
            'status' => 'in_progress',
            'checked_in_at' => now(),
        ]);

        return response()->json(['data' => $session->load(['visitor', 'inmate', 'items'])]);
    }

    public function checkOut(VisitSession $session)
    {
        $session->update([
            'status' => 'completed',
            'checked_out_at' => now(),
        ]);

        return response()->json(['data' => $session->load(['visitor', 'inmate', 'items'])]);
    }

    public function deny(VisitSession $session, DenyVisitSessionRequest $request)
    {
        $session->update([
            'status' => 'denied',
            'denial_reason' => $request->validated('denial_reason'),
            'denial_notes' => $request->validated('denial_notes'),
            'checked_out_at' => now(),
        ]);

        return response()->json(['data' => $session->load(['visitor', 'inmate', 'items'])]);
    }

    public function cancel(VisitSession $session, Request $request)
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

        return response()->json(['data' => $session->load(['visitor', 'inmate', 'items'])]);
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
            $data['duration_minutes'] ?? 60
        );

        return response()->json([
            'eligible' => $eligibilityResult['eligible'],
            'eligibility_reason' => $eligibilityResult['reason'],
            'conflict' => $conflict,
            'available' => $eligibilityResult['eligible'] && !$conflict,
        ]);
    }
}
