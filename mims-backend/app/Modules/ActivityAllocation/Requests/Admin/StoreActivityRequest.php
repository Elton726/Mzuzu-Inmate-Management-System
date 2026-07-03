<?php

namespace App\Modules\ActivityAllocation\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreActivityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) auth()->user()?->isAdmin();
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100', 'unique:activities,name'],
            'category_id' => ['required', 'exists:activity_categories,id'],
            'eligibility_criteria' => ['nullable', 'array'],
            'eligibility_criteria.allowed_inmate_types' => ['sometimes', 'array'],
            'eligibility_criteria.allowed_inmate_types.*' => ['in:convict'],
            'eligibility_criteria.min_sentence_years' => ['sometimes', 'numeric', 'min:0'],
            'eligibility_criteria.min_remaining_years' => ['sometimes', 'numeric', 'min:0'],
            'eligibility_criteria.max_remaining_years' => ['sometimes', 'numeric', 'min:0'],
            'eligibility_criteria.skills_required' => ['sometimes', 'array'],
            'eligibility_criteria.skills_required.*' => ['string', 'max:100'],
            'max_participants' => ['nullable', 'integer', 'min:1'],
            'is_active' => ['sometimes', 'boolean'],
            'security_level' => ['sometimes', 'in:low,medium,high'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $min = (float) $this->input('eligibility_criteria.min_remaining_years', 0);
            $max = (float) $this->input('eligibility_criteria.max_remaining_years', 0);

            if ($max > 0 && $max < $min) {
                $validator->errors()->add(
                    'eligibility_criteria.max_remaining_years',
                    'Maximum must be greater than or equal to Minimum.'
                );
            }
        });
    }
}
