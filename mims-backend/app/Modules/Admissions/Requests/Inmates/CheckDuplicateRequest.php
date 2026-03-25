<?php

namespace App\Modules\Admissions\Requests\Inmates;

use Illuminate\Foundation\Http\FormRequest;

class CheckDuplicateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:50'],
            'last_name' => ['required', 'string', 'max:50'],
            'date_of_birth' => ['required', 'date'],
            'national_id' => ['nullable', 'string', 'max:20'],
        ];
    }
}
