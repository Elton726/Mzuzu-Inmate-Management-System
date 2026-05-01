<?php

namespace App\Modules\Visitation\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreVisitationRuleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'inmate_id' => ['required', 'integer', 'exists:inmates,id'],
            'rule_type' => ['required', 'string', 'in:restricted_visitors,contact_only,supervised_only,no_visitation'],
            'description' => ['required', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    protected function prepareForValidation()
    {
        if ($this->has('is_active')) {
            $this->merge([ 'is_active' => $this->boolean('is_active') ]);
        }
    }
}
