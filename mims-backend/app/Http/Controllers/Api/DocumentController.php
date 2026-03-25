<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Documents\StoreDocumentRequest;
use App\Services\AuditLogService;
use App\Services\DocumentStorageService;

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

