<?php

namespace App\Modules\Visitation\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Visitation\Models\CharityBooking;
use App\Modules\Visitation\Requests\RejectCharityBookingRequest;
use App\Modules\Visitation\Requests\StoreCharityBookingRequest;
use App\Modules\Visitation\Services\VisitationNotificationService;
use Dompdf\Dompdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;

class CharityBookingController extends Controller
{
    public function store(StoreCharityBookingRequest $request, VisitationNotificationService $notifications) {
        $data = $request->validated();

        $booking = CharityBooking::create([
            ...$data,
            'status'     => 'pending',
            'created_by' => $request->user()->id,
        ]);

        $path = $this->generatePdf($booking);
        $booking->update(['pdf_path' => $path]);

        $notifications->forRole(
            'station_officer',
            'New charity visit request',
            "{$booking->organisation_name} submitted a charity visit request for {$booking->proposed_date->toDateString()}.",
            'info',
            '/visitation/charity-pending',
            ['booking_id' => $booking->id]
        );

        return response()->json([
            'data'         => $booking->fresh(),
            'download_url' => $this->downloadUrl($booking),
        ], 201);
    }

    public function approve(CharityBooking $booking, Request $request, VisitationNotificationService $notifications)
    {
        if ($booking->status !== 'pending') {
            return response()->json(['message' => 'Only pending charity bookings can be approved.'], 422);
        }

        $data = $request->validate([
            'approval_notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $booking->update([
            'status' => 'approved',
            'approved_by' => request()->user()->id,
            'approved_at' => now(),
            'approval_notes' => $data['approval_notes'] ?? null,
        ]);

        $notifications->forRole(
            'gatekeeper',
            'Charity visit approved',
            "{$booking->organisation_name} has been approved for {$booking->proposed_date->toDateString()}.",
            'success',
            '/visitation',
            ['booking_id' => $booking->id]
        );

        return response()->json(['data' => $booking->fresh(['inmate', 'approver'])]);
    }

    public function reject(CharityBooking $booking, RejectCharityBookingRequest $request, VisitationNotificationService $notifications)
    {
        if ($booking->status !== 'pending') {
            return response()->json(['message' => 'Only pending charity bookings can be rejected.'], 422);
        }

        $booking->update([
            'status' => 'rejected',
            'rejection_reason' => $request->validated('reason'),
            'rejected_by' => $request->user()->id,
            'rejected_at' => now(),
        ]);

        $notifications->forRole(
            'gatekeeper',
            'Charity visit rejected',
            "{$booking->organisation_name} was rejected." . ($booking->rejection_reason ? " Reason: {$booking->rejection_reason}" : ''),
            'warning',
            '/visitation/charity-pending',
            ['booking_id' => $booking->id]
        );

        return response()->json(['data' => $booking->fresh('inmate')]);
    }

    public function downloadPdf(CharityBooking $booking)
    {
        abort_unless($booking->pdf_path && Storage::disk('local')->exists($booking->pdf_path), 404);

        return Storage::disk('local')->download(
            $booking->pdf_path,
            'charity-booking-' . substr($booking->id, 0, 8) . '.pdf'
        );
    }

    private function generatePdf(CharityBooking $booking): string
    {
        $html = view('visitation.charity_pdf', [
            'booking'   => $booking,
            'reference' => strtoupper(substr($booking->id, 0, 8)),
        ])->render();

        $dompdf = new Dompdf();
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4');
        $dompdf->render();

        $path = 'charity-pdfs/' . $booking->id . '.pdf';
        Storage::disk('local')->put($path, $dompdf->output());

        return $path;
    }

    private function downloadUrl(CharityBooking $booking): string
    {
        return URL::temporarySignedRoute(
            'visitation.charity-pdf',
            now()->addMinutes(60),
            ['booking' => $booking->id]
        );
    }
}
