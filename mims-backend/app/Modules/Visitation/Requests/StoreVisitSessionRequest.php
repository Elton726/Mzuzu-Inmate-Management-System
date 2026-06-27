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
            'id_type' => ['required_without:charity_booking_id', 'string', 'max:100'],
            'id_number' => ['required_without:charity_booking_id', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:50'],
            'inmate_id' => ['required_without:charity_booking_id', 'integer', Rule::exists('inmates', 'id')->where('status', 'active')],
            'visit_type' => ['nullable', 'in:regular,charity'],
            'charity_booking_id' => ['nullable', 'uuid', 'exists:charity_bookings,id'],
        ];
    }
}
