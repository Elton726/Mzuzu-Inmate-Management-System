<?php

namespace App\Modules\Visitation\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateVisitorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'first_name' => ['sometimes', 'string', 'max:50'],
            'last_name' => ['sometimes', 'string', 'max:50'],
            'relationship' => ['sometimes', 'string', 'in:family,friend,legal_representative,social_worker,charity_representative,other'],
            'contact_number' => ['sometimes', 'string', 'regex:/^\+?[0-9\s\-]{7,20}$/'],
            'national_id' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:100'],
        ];
    }
}
