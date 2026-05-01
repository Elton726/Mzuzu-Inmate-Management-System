<?php

namespace App\Modules\Visitation\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreInmateVisitorRegistrationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'inmate_id' => ['required', 'integer', 'exists:inmates,id'],
            'visitor_id' => ['required', 'integer', 'exists:visitors,id'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
