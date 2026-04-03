<?php

namespace App\Modules\ActivityAllocation\Requests\Officer;

use Illuminate\Foundation\Http\FormRequest;

class UpdateActivitySessionRequest extends FormRequest
{
    public function authorize()
    {
        $user = $this->user();
        return (bool) $user && $user->hasRole('officer_on_duty');
    }

    public function rules()
    {
        return [
            'session_date' => 'sometimes|date',
            'session_time' => 'sometimes|string|max:20',
            'supervising_officer_id' => 'sometimes|exists:users,id',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i|after:start_time',
            'status' => 'sometimes|in:scheduled,in_progress,completed,cancelled',
            'notes' => 'nullable|string',
        ];
    }
}
