<?php

namespace App\Modules\ActivityAllocation\Controllers\Officer;

use App\Http\Controllers\Controller;
use App\Modules\ActivityAllocation\Services\Officer\AttendanceService;
use App\Modules\ActivityAllocation\Requests\Officer\StoreAttendanceRequest;
use Illuminate\Http\Request;
use App\Modules\ActivityAllocation\Models\SessionAttendance;

class SessionAttendanceController extends Controller
{
    public function __construct(protected AttendanceService $attendanceService) {}

    /**
     * Record bulk attendance for a session.
     */
    public function store(StoreAttendanceRequest $request)
    {
        try {
            $attendances = $this->attendanceService->recordBulkAttendance(
                $request->session_id,
                $request->attendances
            );
            return response()->json($attendances, 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /**
     * Get full attendance report for a session (including unmarked inmates).
     */
    public function report($sessionId)
    {
        $report = $this->attendanceService->getSessionAttendanceReport($sessionId);
        return response()->json($report);
    }

    /**
     * Get summary statistics for a session (counts of present/absent/late).
     */
    public function summary($sessionId)
    {
        $summary = $this->attendanceService->getSessionSummary($sessionId);
        return response()->json($summary);
    }

    /**
     * Update a single attendance record.
     */
    public function update(Request $request, $attendanceId)
    {
        $request->validate([
            'attendance_status' => 'required|in:present,absent,late,excused',
            'notes' => 'nullable|string',
        ]);

        $attendance = SessionAttendance::findOrFail($attendanceId);
        $attendance->update($request->only(['attendance_status', 'notes']));

        return response()->json($attendance);
    }
}
