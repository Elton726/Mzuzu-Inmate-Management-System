<?php

namespace App\Modules\ActivityAllocation\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class AutoAssignOfficerDutyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) auth()->user()?->isAdmin();
    }

    public function rules(): array
    {
        return [
            'shifts' => ['sometimes', 'array'],
            'shifts.*' => ['in:morning,afternoon,night'],
        ];
    }
}

