<?php

namespace App\Modules\ActivityAllocation\Repositories;

use App\Modules\ActivityAllocation\Models\SessionAttendance;

class SessionAttendanceRepository
{
    public function create(array $data)
    {
        return SessionAttendance::create($data);
    }

    public function update($id, array $data)
    {
        $attendance = SessionAttendance::findOrFail($id);
        $attendance->update($data);
        return $attendance;
    }

    public function findBySessionAndInmate($sessionId, $inmateId)
    {
        return SessionAttendance::where('session_id', $sessionId)
            ->where('inmate_id', $inmateId)
            ->first();
    }

    public function getBySession($sessionId)
    {
        return SessionAttendance::where('session_id', $sessionId)
            ->with(['inmate', 'admission'])
            ->get();
    }
}
