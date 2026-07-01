<?php

namespace App\Modules\Release\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSentenceAdjustmentTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isAdmin();
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('name')) {
            $this->merge([
                'name' => str($this->input('name'))->trim()->lower()->replaceMatches('/[^a-z0-9]+/', '_')->trim('_')->toString(),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100', 'unique:sentence_adjustment_types,name'],
            'years_to_reduce' => ['required', 'integer', 'min:0'],
            'info' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
