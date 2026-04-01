<?php

namespace App\Modules\ActivityAllocation\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateActivityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) auth()->user()?->isAdmin();
    }

    public function rules(): array
    {
        $activityId = $this->route('id') ?? $this->route('activity');

        return [
            'name' => ['sometimes', 'string', 'max:100', 'unique:activities,name,' . $activityId],
            'source_type' => ['sometimes', 'in:predefined,custom'],
            'category_id' => ['nullable', 'exists:activity_categories,id'],
            'eligibility_criteria' => ['nullable'],
            'max_participants' => ['nullable', 'integer', 'min:1'],
            'is_active' => ['sometimes', 'boolean'],
            'security_level' => ['sometimes', 'in:low,medium,high'],
            'activity_type' => ['sometimes', 'in:internal,external'],
        ];
    }
}

