<?php

namespace App\Modules\Visitation\Requests;

use Illuminate\Foundation\Http\FormRequest;

class InspectVisitationItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'is_approved' => ['required', 'boolean'],
            'inspection_notes' => ['nullable', 'string'],
        ];
    }
}
