<?php

namespace App\Modules\Visitation\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreVisitItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'item_description' => ['required', 'string', 'max:255'],
            'status' => ['nullable', 'in:pending,approved,flagged'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
