<?php

namespace App\Modules\Admissions\Requests\Inmates;

use Illuminate\Foundation\Http\FormRequest;

class UpdateInmateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $inmateId = $this->route('inmate')?->id ?? $this->route('inmate');

        return [
            'first_name' => ['sometimes', 'string', 'max:50'],
            'last_name' => ['sometimes', 'string', 'max:50'],
            'other_names' => ['sometimes', 'nullable', 'string', 'max:100'],
            'date_of_birth' => ['sometimes', 'date', 'before:today'],
            'is_young_offender' => ['sometimes', 'boolean'],
            'nationality' => ['sometimes', 'nullable', 'string', 'max:50'],
            'national_id' => ['sometimes', 'nullable', 'string', 'regex:/^(?=.*[A-Z])(?=.*\d)[A-Z\d]{8}$/', 'unique:inmates,national_id,'.$inmateId],
            'marital_status' => ['sometimes', 'nullable', 'string', 'max:20'],
            'next_of_kin_name' => ['sometimes', 'nullable', 'string', 'max:100'],
            'next_of_kin_contact' => ['sometimes', 'nullable', 'string', 'regex:/^\+[1-9]\d{7,14}$/', 'max:50'],
            'personal_belongings' => ['sometimes', 'nullable', 'string', 'max:500'],
            'status' => ['sometimes', 'in:active,released,deceased,transferred'],
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
