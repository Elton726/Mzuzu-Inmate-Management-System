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
            'eligibility_criteria' => ['nullable'],
            'max_participants' => ['nullable', 'integer', 'min:1'],
            'is_active' => ['sometimes', 'boolean'],
            'security_level' => ['sometimes', 'in:low,medium,high'],
        ];
    }
}
