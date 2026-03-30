<?php

namespace App\Modules\Admissions\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Admissions\Models\Inmate;
use App\Modules\Admissions\Requests\Documents\StoreDocumentRequest;
use App\Modules\Admissions\Services\DocumentStorageService;
use App\Services\AuditLogService;

class DocumentController extends Controller
{
    public function __construct(
        private readonly DocumentStorageService $documentStorageService,
        private readonly AuditLogService $auditLogService,
    ) {
        $this->middleware('auth:sanctum');
    }

    public function store(StoreDocumentRequest $request)
    {
        $user = $request->user();
        $inmateId = (int) $request->validated('inmate_id');

        $document = $this->documentStorageService->store(
            $request->file('file'),
            $inmateId,
            $request->validated('admission_id'),
            $request->validated('document_type'),
            $user->id,
            $request->validated('description'),
        );

        $this->auditLogService->log(
            $user->id,
            'INSERT',
            'documents',
            $document->id,
            null,
            $document->toArray(),
            $request->ip(),
        );

        // Return the document along with the updated inmate if it's a photo
        $response = $document->toArray();

        $documentType = strtolower($request->validated('document_type'));
        if (in_array($documentType, ['photo', 'inmate_photo'], true)) {
            $inmate = Inmate::find($inmateId);
            if ($inmate) {
                $response['inmate'] = $inmate->only(['id', 'prison_number', 'first_name', 'last_name', 'photo_path']);
            }
        }

        return response()->json($response, 201);
    }
}

