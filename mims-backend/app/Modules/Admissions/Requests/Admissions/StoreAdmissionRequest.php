<?php

namespace App\Modules\Admissions\Requests\Admissions;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAdmissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'inmate_id' => ['required', 'exists:inmates,id'],
            'admission_date' => ['required', 'date'],
            'admission_type' => ['nullable', 'in:first_time,repeat'],
            'inmate_type' => ['required', 'in:convict,remandee,murder_remandee'],
            'case_number' => ['required', 'string', 'max:50'],
            'court_name' => ['nullable', 'string', 'max:100'],
            'offence_description' => ['nullable', 'string'],

            'sentence_years' => ['nullable', 'integer', 'min:0', 'required_if:inmate_type,convict'],
            'sentence_months' => ['nullable', 'integer', 'min:0', 'max:11'],
            'sentence_start_date' => ['nullable', 'date', 'required_if:inmate_type,convict'],

            'remand_next_court_date' => ['nullable', 'date', 'required_if:inmate_type,remandee,murder_remandee'],
            'remand_duration_days' => ['nullable', 'integer', 'min:1'],

            'activity_id' => [
                'nullable',
                Rule::exists('activities', 'id')->where(function ($query) {
                    $query
                        ->where('is_active', true)
                        ->where('activity_type', 'internal')
                        ->where('source_type', 'predefined');
                }),
            ],

            'committal_warrant_id' => ['nullable', 'exists:documents,id'],
            'remand_warrant_id' => ['nullable', 'exists:documents,id'],
        ];
    }
}
