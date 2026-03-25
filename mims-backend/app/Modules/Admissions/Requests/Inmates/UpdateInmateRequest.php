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
            'place_of_birth' => ['sometimes', 'nullable', 'string', 'max:100'],
            'nationality' => ['sometimes', 'nullable', 'string', 'max:50'],
            'national_id' => ['sometimes', 'nullable', 'string', 'max:20', 'unique:inmates,national_id,'.$inmateId],
            'marital_status' => ['sometimes', 'nullable', 'string', 'max:20'],
            'next_of_kin_name' => ['sometimes', 'nullable', 'string', 'max:100'],
            'next_of_kin_contact' => ['sometimes', 'nullable', 'string', 'max:50'],
            'status' => ['sometimes', 'in:active,released,deceased,transferred'],
        ];
    }
}
