<?php

namespace App\Modules\Visitation\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreVisitSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'full_name' => ['required_without:charity_booking_id', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'visitor_id' => ['nullable', 'uuid', 'exists:visitors,id'],
            'relationship_type' => ['nullable', 'string', 'max:100'],
            'relationship_notes' => ['nullable', 'string', 'max:1000'],
            'inmate_id' => ['required_without:charity_booking_id', 'integer', Rule::exists('inmates', 'id')->where('status', 'active')],
            'visit_type' => ['nullable', 'in:regular,charity'],
            'charity_booking_id' => ['nullable', 'uuid', 'exists:charity_bookings,id'],
            'items' => ['nullable', 'array'],
            'items.*.item_description' => ['required_with:items', 'string', 'max:255'],
            'items.*.status' => ['required_with:items', 'in:pending,approved,flagged'],
            'items.*.notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
