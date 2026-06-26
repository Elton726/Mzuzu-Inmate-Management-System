<?php

namespace App\Modules\Release\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ClearChecklistItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return (bool) $user && ($user->hasRole('station_officer') || $user->hasRole('gatekeeper'));
    }

    public function rules(): array
    {
        return [
            'checklist_item_id' => ['required', 'integer', 'exists:release_clearance_checklist_items,id'],
            'verification_notes' => ['nullable', 'string', 'max:500'],
        ];
    }
}
