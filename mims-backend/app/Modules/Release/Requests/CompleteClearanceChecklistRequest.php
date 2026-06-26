<?php

namespace App\Modules\Release\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CompleteClearanceChecklistRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return (bool) $user && $user->hasRole('station_officer');
    }

    public function rules(): array
    {
        return [];
    }
}
