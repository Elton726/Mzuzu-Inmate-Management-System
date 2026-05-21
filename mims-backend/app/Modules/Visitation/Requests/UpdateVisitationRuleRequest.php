<?php

namespace App\Modules\Visitation\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateVisitationRuleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'rule_type' => ['sometimes', 'string', 'in:restricted_visitors,contact_only,supervised_only,no_visitation'],
            'description' => ['sometimes', 'string'],
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
