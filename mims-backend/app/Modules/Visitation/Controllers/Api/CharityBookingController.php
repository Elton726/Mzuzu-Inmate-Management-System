<?php

namespace App\Modules\Visitation\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Visitation\Models\CharityBooking;
use App\Modules\Visitation\Requests\RejectCharityBookingRequest;
use App\Modules\Visitation\Requests\StoreCharityBookingRequest;
use Dompdf\Dompdf;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;

class CharityBookingController extends Controller
{
    public function store(StoreCharityBookingRequest $request) {
        $data = $request->validated();

        $booking = CharityBooking::create([
            ...$data,
            'status'     => 'pending',
            'created_by' => $request->user()->id,
        ]);

        $path = $this->generatePdf($booking);
        $booking->update(['pdf_path' => $path]);

        return response()->json([
            'data'         => $booking->fresh(),
            'download_url' => $this->downloadUrl($booking),
        ], 201);
    }

    public function approve(CharityBooking $booking)
    {
        if ($booking->status !== 'pending') {
            return response()->json(['message' => 'Only pending charity bookings can be approved.'], 422);
        }

        $booking->update([
            'status' => 'approved',
            'approved_by' => request()->user()->id,
            'approved_at' => now(),
        ]);

        return response()->json(['data' => $booking->fresh(['inmate', 'approver'])]);
    }

    public function reject(CharityBooking $booking, RejectCharityBookingRequest $request)
    {
        if ($booking->status !== 'pending') {
            return response()->json(['message' => 'Only pending charity bookings can be rejected.'], 422);
        }

        $booking->update(['status' => 'rejected']);

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
