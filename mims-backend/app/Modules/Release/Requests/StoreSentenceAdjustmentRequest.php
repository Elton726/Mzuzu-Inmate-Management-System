<?php

namespace App\Modules\Release\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSentenceAdjustmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return (bool) $user && ($user->hasRole('station_officer') || $user->isAdmin());
    }

    public function rules(): array
    {
        return [
            'admission_id' => ['required', 'integer', 'exists:admissions,id'],
            'adjustment_type' => ['required', 'string', Rule::in(['remission', 'pardon', 'reduction'])],
            'adjustment_days' => ['required', 'integer', 'min:1'],
            'effective_date' => ['required', 'date'],
            'reason' => ['nullable', 'string'],
        ];
    }
}
