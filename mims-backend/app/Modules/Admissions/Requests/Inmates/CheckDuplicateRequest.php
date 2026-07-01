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
            'national_id' => ['nullable', 'string', 'regex:/^(?=.*[A-Z])(?=.*\d)[A-Z\d]{8}$/'],
            'nationality' => ['nullable', 'string', 'max:50'],
            'gender' => ['nullable', 'string', 'in:male,female,other'],
            'next_of_kin_name' => ['nullable', 'string', 'max:100'],
            'next_of_kin_contact' => ['nullable', 'string', 'regex:/^\+[1-9]\d{7,14}$/', 'max:50'],
        ];
    }

    public function messages(): array
    {
        return [
            'national_id.regex' => 'National ID must be exactly 8 uppercase letters and digits, with at least one of each.',
            'next_of_kin_contact.regex' => 'Next of kin contact must be a valid international phone number, for example +265991234567.',
        ];
    }
}
