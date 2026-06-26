<?php

namespace App\Modules\Release\Requests;

use Illuminate\Foundation\Http\FormRequest;

class InitiateClearanceChecklistRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return (bool) $user && $user->hasRole('station_officer');
    }

    public function rules(): array
    {
        return [
            'release_workflow_id' => ['required', 'integer', 'exists:release_workflow,id'],
            'admission_id' => ['required', 'integer', 'exists:admissions,id'],
        ];
    }
}
