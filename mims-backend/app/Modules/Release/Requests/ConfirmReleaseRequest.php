<?php

namespace App\Modules\Release\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ConfirmReleaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return (bool) $user && $user->hasRole('gatekeeper');
    }

    protected function prepareForValidation(): void
    {
        if (!$this->has('notes') && $this->has('confirmation_notes')) {
            $this->merge(['notes' => $this->input('confirmation_notes')]);
        }
    }

    public function rules(): array
    {
        return [
            'notes' => ['nullable', 'string'],
        ];
    }
}
