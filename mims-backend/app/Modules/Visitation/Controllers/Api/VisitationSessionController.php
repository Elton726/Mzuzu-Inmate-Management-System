<?php

namespace App\Modules\Visitation\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Visitation\Requests\DenyVisitationSessionRequest;
use App\Modules\Visitation\Requests\StoreVisitationSessionRequest;
use App\Modules\Visitation\Services\VisitationSessionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class VisitationSessionController extends Controller
{
    public function __construct(private VisitationSessionService $service)
    {
        $this->middleware('auth:sanctum');
    }

    public function index(Request $request)
    {
        $filters = [
            'inmate_id' => $request->integer('inmate_id') ?: null,
            'visitor_id' => $request->integer('visitor_id') ?: null,
            'status' => $request->query('status') ?: null,
            'search' => $request->query('search') ?: null,
            'is_charity_visit' => $request->has('is_charity_visit') ? $request->boolean('is_charity_visit') : null,
            'start_date' => $request->query('start_date') ?: null,
            'end_date' => $request->query('end_date') ?: null,
        ];

        return response()->json($this->service->list(array_filter($filters, fn ($value) => $value !== null), $request->integer('per_page', 15)));
    }

    public function store(StoreVisitationSessionRequest $request)
    {
        try {
            return response()->json($this->service->schedule($request->validated()), 201);
        } catch (RuntimeException $exception) {
            return response()->json(['error' => $exception->getMessage()], 422);
        }
    }

    public function show(int $id)
    {
        return response()->json($this->service->get($id));
    }

    public function checkIn(int $id)
    {
        try {
            return response()->json($this->service->checkIn($id));
        } catch (RuntimeException $exception) {
            return response()->json(['error' => $exception->getMessage()], 422);
        }
    }

    public function checkOut(int $id)
    {
        try {
            return response()->json($this->service->checkOut($id));
        } catch (RuntimeException $exception) {
            return response()->json(['error' => $exception->getMessage()], 422);
        }
    }

    public function cancel(int $id)
    {
        try {
            return response()->json($this->service->cancel($id));
        } catch (RuntimeException $exception) {
            return response()->json(['error' => $exception->getMessage()], 422);
        }
    }

    public function deny(DenyVisitationSessionRequest $request, int $id)
    {
        try {
            return response()->json($this->service->deny($id, $request->validated()['reason'], $request->validated()['notes'] ?? null));
        } catch (RuntimeException $exception) {
            return response()->json(['error' => $exception->getMessage()], 422);
        }
    }

    public function downloadPdf(int $id)
    {
        $session = $this->service->get($id);
        if (!$session->pdf_file_path) {
            return response()->json(['error' => 'No charity PDF has been generated for this session.'], 404);
        }

        if (!Storage::disk('public')->exists($session->pdf_file_path)) {
            return response()->json(['error' => 'PDF file not found.'], 404);
        }

        return Storage::disk('public')->download($session->pdf_file_path);
    }
}
