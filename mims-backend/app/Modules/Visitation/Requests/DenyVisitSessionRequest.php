<?php

namespace App\Modules\Visitation\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DenyVisitSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'denial_reason' => ['required', 'string', Rule::in([
                'Prohibited items found',
                'Inmate refused visit',
                'Visitor ID invalid',
                'Security concern',
                'Other',
            ])],
            'denial_notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
