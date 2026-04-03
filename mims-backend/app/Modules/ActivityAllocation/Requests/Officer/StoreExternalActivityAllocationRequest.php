<?php

namespace App\Modules\ActivityAllocation\Requests\Officer;

use Illuminate\Foundation\Http\FormRequest;

class StoreExternalActivityAllocationRequest extends FormRequest
{
    public function authorize()
    {
        $user = $this->user();
        return (bool) $user && $user->hasRole('officer_on_duty');
    }

    public function rules()
    {
        return [
            'inmate_ids' => 'required|array|min:1',
            'inmate_ids.*' => 'integer|exists:inmates,id',
            'notes' => 'nullable|string',
        ];
    }
}

