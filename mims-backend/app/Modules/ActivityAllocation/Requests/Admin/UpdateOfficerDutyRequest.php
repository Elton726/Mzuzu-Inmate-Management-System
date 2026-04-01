<?php

namespace App\Modules\ActivityAllocation\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateOfficerDutyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) auth()->user()?->isAdmin();
    }

    public function rules(): array
    {
        return [
            'officer_id' => ['sometimes', 'exists:users,id'],
            'duty_week_start' => ['sometimes', 'date'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
