<?php

namespace App\Modules\ActivityAllocation\Requests\Officer;

use Illuminate\Foundation\Http\FormRequest;

class StoreAttendanceRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        // Support nested routes like /activity-sessions/{session}/attendance
        // while keeping backwards compatibility with body `session_id`.
        $sessionFromRoute = $this->route('session');
        if ($this->missing('session_id') && $sessionFromRoute !== null) {
            $this->merge(['session_id' => (int) $sessionFromRoute]);
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
            'session_id' => 'required|exists:activity_sessions,id',
            'attendances' => 'required|array',
            'attendances.*.inmate_id' => 'required|exists:inmates,id',
            'attendances.*.admission_id' => 'required|exists:admissions,id',
            'attendances.*.attendance_status' => 'required|in:present,absent,late,excused',
            'attendances.*.notes' => 'nullable|string',
        ];
    }
}
