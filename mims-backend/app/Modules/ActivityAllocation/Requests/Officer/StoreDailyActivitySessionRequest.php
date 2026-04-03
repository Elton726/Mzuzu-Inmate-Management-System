<?php

namespace App\Modules\ActivityAllocation\Requests\Officer;

use Illuminate\Foundation\Http\FormRequest;

class StoreDailyActivitySessionRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if ($this->missing('session_date')) {
            $this->merge(['session_date' => now()->toDateString()]);
        }

        if ($this->missing('session_time')) {
            $this->merge(['session_time' => 'Daily']);
        }

        if ($this->missing('supervising_officer_id') && $this->user()) {
            $this->merge(['supervising_officer_id' => (int) $this->user()->id]);
        }
    }

    public function authorize()
    {
        $user = $this->user();
        return (bool) $user && $user->hasRole('officer_on_duty');
    }

    public function rules()
    {
        return [
            'activity_id' => 'required|exists:activities,id',
            'session_date' => 'required|date',
            'session_time' => 'required|string|max:20',
            'supervising_officer_id' => 'required|exists:users,id',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i|after:start_time',
            'status' => 'sometimes|in:scheduled,in_progress,completed,cancelled',
            'notes' => 'nullable|string',
        ];
    }
}
