<?php

namespace App\Modules\Visitation\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreVisitationItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'visitation_session_id' => ['required', 'integer', 'exists:visitation_sessions,id'],
            'item_description' => ['required', 'string'],
            'item_category' => ['required', 'string', 'in:food,clothing,reading_material,toiletries,documents,other'],
            'quantity' => ['sometimes', 'integer', 'min:1'],
        ];
    }
}
