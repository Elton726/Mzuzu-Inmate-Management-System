<?php

namespace App\Modules\Visitation\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DenyVisitationSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
