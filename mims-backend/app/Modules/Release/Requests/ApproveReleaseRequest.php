<?php

namespace App\Modules\Release\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ApproveReleaseRequest extends FormRequest
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
            'notes' => ['nullable', 'string'],
        ];
    }
}
