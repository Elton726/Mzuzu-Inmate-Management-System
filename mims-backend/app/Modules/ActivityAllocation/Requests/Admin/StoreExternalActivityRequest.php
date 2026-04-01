<?php

namespace App\Modules\ActivityAllocation\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreExternalActivityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) auth()->user()?->isAdmin();
    }

    public function rules(): array
    {
        return [
            'location' => ['required', 'string', 'max:255'],
            'external_partner' => ['nullable', 'string', 'max:255'],
            'requires_transport' => ['sometimes', 'boolean'],
            'transport_details' => ['nullable', 'string'],
            'safety_requirements' => ['nullable', 'string'],
            'supervisor_requirements' => ['nullable', 'string'],
        ];
    }
}

