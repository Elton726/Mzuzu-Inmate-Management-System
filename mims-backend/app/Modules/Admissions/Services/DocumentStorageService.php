<?php

namespace App\Modules\Admissions\Services;

use App\Modules\Admissions\Models\Document;
use Illuminate\Http\UploadedFile;

class DocumentStorageService
{
    public function store(
        UploadedFile $file,
        int $inmateId,
        ?int $admissionId,
        string $documentType,
        int $uploadedByUserId,
        ?string $description = null
    ): Document {
        $path = $file->store('documents/'.$inmateId, 'public');

        return Document::create([
            'inmate_id' => $inmateId,
            'admission_id' => $admissionId,
            'document_type' => $documentType,
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'mime_type' => $file->getClientMimeType(),
            'uploaded_by' => $uploadedByUserId,
            'description' => $description,
        ]);
    }
}
