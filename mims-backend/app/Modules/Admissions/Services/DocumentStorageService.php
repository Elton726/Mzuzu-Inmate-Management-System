<?php

namespace App\Modules\Admissions\Services;

use App\Modules\Admissions\Models\Document;
use App\Modules\Admissions\Models\Inmate;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;

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

        $document = Document::create([
            'inmate_id' => $inmateId,
            'admission_id' => $admissionId,
            'document_type' => $documentType,
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'mime_type' => $file->getClientMimeType(),
            'uploaded_by' => $uploadedByUserId,
            'description' => $description,
        ]);

        // If this is a photo document, update the inmate's photo_path
        if ((strtolower($documentType) === 'photo' || strtolower($documentType) === 'inmate_photo') && $path) {
            $inmate = Inmate::find($inmateId);
            if ($inmate) {
                $inmate->update(['photo_path' => $path]);
                Log::info('Inmate photo updated', [
                    'inmate_id' => $inmateId,
                    'document_id' => $document->id,
                    'photo_path' => $path,
                    'document_type' => $documentType,
                ]);
            } else {
                Log::warning('Inmate not found for photo update', ['inmate_id' => $inmateId]);
            }
        }

        return $document;
    }
}
