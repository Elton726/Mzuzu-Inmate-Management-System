<?php

namespace App\Modules\ActivityAllocation\Services\Officer;

use App\Modules\ActivityAllocation\Repositories\SessionAttendanceRepository;
use App\Modules\ActivityAllocation\Events\AttendanceRecorded;
use App\Modules\Admissions\Models\InmateActivity;
use Illuminate\Support\Collection;

class AttendanceService
{
    public function __construct(protected SessionAttendanceRepository $repository) {}

    /**
     * Record attendance for a single inmate.
     */
    public function recordAttendance(array $data)
    {
        // Check that the inmate is currently assigned to the activity of the session
        $session = \App\Modules\ActivityAllocation\Models\ActivitySession::with('activity')->findOrFail($data['session_id']);

        $isAssigned = InmateActivity::where('inmate_id', $data['inmate_id'])
            ->where('activity_id', $session->activity_id)
            ->where('admission_id', $data['admission_id'])
            ->whereNull('end_date')
            ->exists();

        if (!$isAssigned) {
            throw new \Exception('Inmate is not assigned to this activity for the given admission.');
        }

        // Check if attendance already exists for this session and inmate
        $existing = $this->repository->findBySessionAndInmate($data['session_id'], $data['inmate_id']);
        if ($existing) {
            // Update instead of duplicate
            return $this->repository->update($existing->id, $data);
        }

        $attendance = $this->repository->create($data);
        event(new AttendanceRecorded($attendance));
        return $attendance;
    }

    /**
     * Record bulk attendance for a session.
     */
    public function recordBulkAttendance(int $sessionId, array $attendances): Collection
    {
        $records = [];
        foreach ($attendances as $att) {
            $records[] = $this->recordAttendance([
                'session_id' => $sessionId,
                'inmate_id' => $att['inmate_id'],
                'admission_id' => $att['admission_id'],
                'attendance_status' => $att['attendance_status'],
                'notes' => $att['notes'] ?? null,
                'recorded_by' => auth()->id(),
                'recorded_at' => now(),
            ]);
        }
        return collect($records);
    }

    /**
     * Get attendance report for a session, including all assigned inmates.
     */
    public function getSessionAttendanceReport(int $sessionId): array
    {
        $session = \App\Modules\ActivityAllocation\Models\ActivitySession::with('activity')->findOrFail($sessionId);

        // Get all inmates assigned to this activity (from inmate_activities) with current admission
        $assignedInmates = InmateActivity::where('activity_id', $session->activity_id)
            ->whereNull('end_date')
            ->with(['inmate', 'admission'])
            ->get();

        $attendanceRecords = $this->repository->getBySession($sessionId)->keyBy('inmate_id');

        $report = [];
        foreach ($assignedInmates as $assignment) {
            $att = $attendanceRecords->get($assignment->inmate_id);
            $report[] = [
                'inmate_id' => $assignment->inmate->id,
                'inmate_name' => $assignment->inmate->first_name . ' ' . $assignment->inmate->last_name,
                'prison_number' => $assignment->inmate->prison_number,
                'admission_id' => $assignment->admission_id,
                'attendance_status' => $att ? $att->attendance_status : 'unmarked',
                'notes' => $att ? $att->notes : null,
                'recorded_at' => $att ? $att->recorded_at : null,
            ];
        }

        return $report;
    }

    /**
     * Get summary statistics for a session.
     */
    public function getSessionSummary(int $sessionId): array
    {
        $attendances = $this->repository->getBySession($sessionId);
        return [
            'total_present' => $attendances->where('attendance_status', 'present')->count(),
            'total_absent' => $attendances->where('attendance_status', 'absent')->count(),
            'total_late' => $attendances->where('attendance_status', 'late')->count(),
            'total_excused' => $attendances->where('attendance_status', 'excused')->count(),
            'total_recorded' => $attendances->count(),
        ];
    }
}
