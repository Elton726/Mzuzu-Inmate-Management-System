<?php

namespace App\Http\Requests\Documents;

use Illuminate\Foundation\Http\FormRequest;

class StoreDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'inmate_id' => ['required', 'exists:inmates,id'],
            'admission_id' => ['nullable', 'exists:admissions,id'],
            'document_type' => ['required', 'string', 'max:50'],
            'description' => ['nullable', 'string'],
            'file' => ['required', 'file', 'max:5120', 'mimes:pdf,jpeg,jpg,png'],
        ];
    }
}

