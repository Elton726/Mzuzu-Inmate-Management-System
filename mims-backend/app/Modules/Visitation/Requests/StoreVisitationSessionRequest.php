<?php

namespace App\Modules\Visitation\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreVisitationSessionRequest extends FormRequest
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
            'admission_id' => ['required', 'integer', 'exists:admissions,id'],
            'visit_date' => ['required', 'date', 'after_or_equal:today'],
            'visit_time' => ['required', 'date_format:H:i'],
            'duration_minutes' => ['nullable', 'integer', 'min:15', 'max:480'],
            'location' => ['nullable', 'string', 'max:100'],
            'visit_purpose' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'is_charity_visit' => ['sometimes', 'boolean'],
            'charity_organization' => ['required_if:is_charity_visit,true', 'nullable', 'string', 'max:255'],
            'charity_purpose' => ['required_if:is_charity_visit,true', 'nullable', 'string'],
        ];
    }

    protected function prepareForValidation()
    {
        if ($this->has('is_charity_visit')) {
            $this->merge([ 'is_charity_visit' => $this->boolean('is_charity_visit') ]);
        }
    }
}
