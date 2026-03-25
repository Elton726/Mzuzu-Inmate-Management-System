<?php

namespace App\Modules\Admissions\Controllers\Api;

use App\Http\Controllers\Controller;
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

        $document = $this->documentStorageService->store(
            $request->file('file'),
            (int) $request->validated('inmate_id'),
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

        return response()->json($document, 201);
    }
}
