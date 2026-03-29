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
            'is_young_offender' => ['sometimes', 'boolean'],
            'place_of_birth' => ['nullable', 'string', 'max:100'],
            'nationality' => ['nullable', 'string', 'max:50'],
            'national_id' => ['nullable', 'string', 'max:20', 'unique:inmates,national_id'],
            'marital_status' => ['nullable', 'string', 'max:20'],
            'next_of_kin_name' => ['nullable', 'string', 'max:100'],
            'next_of_kin_contact' => ['nullable', 'string', 'max:50'],
            'personal_belongings' => ['nullable', 'string', 'max:500'],
        ];
    }
}
