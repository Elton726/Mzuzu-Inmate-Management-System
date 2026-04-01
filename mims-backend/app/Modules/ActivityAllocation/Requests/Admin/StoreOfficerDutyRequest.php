<?php

namespace App\Modules\ActivityAllocation\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreOfficerDutyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) auth()->user()?->isAdmin();
    }

    public function rules(): array
    {
        return [
            'officer_id' => ['required', 'exists:users,id'],
            'duty_week_start' => ['required', 'date'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
