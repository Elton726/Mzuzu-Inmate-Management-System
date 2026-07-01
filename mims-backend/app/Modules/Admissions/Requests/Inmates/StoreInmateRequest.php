<?php

namespace App\Modules\Admissions\Requests\Inmates;

use Illuminate\Foundation\Http\FormRequest;

class StoreInmateRequest extends FormRequest
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
            'other_names' => ['nullable', 'string', 'max:100'],
            'date_of_birth' => ['required', 'date', 'before:today'],
            'gender' => ['nullable', 'string', 'in:male,female,other'],
            'is_young_offender' => ['sometimes', 'boolean'],
            'nationality' => ['nullable', 'string', 'max:50'],
            'national_id' => ['nullable', 'string', 'regex:/^(?=.*[A-Z])(?=.*\d)[A-Z\d]{8}$/', 'unique:inmates,national_id'],
            'marital_status' => ['nullable', 'string', 'max:20'],
            'next_of_kin_name' => ['nullable', 'string', 'max:100'],
            'next_of_kin_contact' => ['nullable', 'string', 'regex:/^\+[1-9]\d{7,14}$/', 'max:50'],
            'personal_belongings' => ['nullable', 'string', 'max:500'],
            'override_justification' => ['nullable', 'string', 'max:500'],
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
