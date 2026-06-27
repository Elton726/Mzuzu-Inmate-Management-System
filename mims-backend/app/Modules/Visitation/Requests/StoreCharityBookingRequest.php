<?php

namespace App\Modules\Visitation\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCharityBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'organisation_name'   => ['required', 'string', 'max:255'],
            'contact_person'      => ['required', 'string', 'max:255'],
            'contact_person_phone'=> ['required', 'string', 'max:50'],
            'inmate_category'     => ['required', 'string', Rule::in(['male', 'female', 'all'])],
            'purpose'             => ['required', 'string', 'max:3000'],
            'proposed_date'       => ['required', 'date', 'after:today'],
            'proposed_time'       => ['required', 'date_format:H:i'],
            'duration_minutes'    => ['required', 'integer', 'min:15', 'max:480'],
        ];
    }
}
