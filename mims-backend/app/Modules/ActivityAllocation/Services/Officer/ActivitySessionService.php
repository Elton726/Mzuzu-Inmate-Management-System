<?php

namespace App\Modules\ActivityAllocation\Services\Officer;

use App\Modules\ActivityAllocation\Repositories\ActivitySessionRepository;
use App\Modules\ActivityAllocation\Events\ActivitySessionCreated;
use App\Modules\ActivityAllocation\Events\ActivitySessionUpdated;
use App\Modules\Admissions\Models\Activity;
use RuntimeException;

class ActivitySessionService
{
    public function __construct(protected ActivitySessionRepository $repository) {}

    public function listSessions(array $filters = [])
    {
        $filters['supervising_officer_id'] = $this->currentOfficerId();

        return $this->repository->all((int) ($filters['per_page'] ?? 15), $filters);
    }

    public function getSession($id)
    {
        return $this->repository->findById($id, $this->currentOfficerId());
    }

    public function createSession(array $data)
    {
        $activity = Activity::query()->findOrFail((int) $data['activity_id']);
        if (!$activity->is_active) {
            throw new RuntimeException('Cannot create a session for an inactive activity.');
        }

        $currentOfficerId = $this->currentOfficerId();
        $data['created_by'] = $currentOfficerId;
        $data['supervising_officer_id'] = $currentOfficerId;
        $data['status'] = 'in_progress';

        $session = $this->repository->create($data);
        $this->autoSaveAttendance($session);
        event(new ActivitySessionCreated($session));

        return $session;
    }

    /**
     * Internal activities are tracked daily: one session per activity per day.
     * This method returns an existing session for the date if one already exists.
     *
     * @return array{session:mixed,created:bool}
     */
    public function getOrCreateDailySession(array $data): array
    {
        $activity = Activity::query()->findOrFail((int) $data['activity_id']);
        $activityId = (int) $activity->getKey();

        if (!$activity->is_active) {
            throw new RuntimeException('Cannot create a session for an inactive activity.');
        }
        if ($activity->activity_type !== 'internal') {
            throw new RuntimeException('Daily tracking is only supported for internal activities.');
        }

        $sessionDate = (string) $data['session_date'];
        $currentOfficerId = $this->currentOfficerId();
        $existing = $this->repository->findByActivityAndDate($activityId, $sessionDate, $currentOfficerId);
        if ($existing) {
            return ['session' => $existing, 'created' => false];
        }

        $data['created_by'] = $currentOfficerId;
        $data['supervising_officer_id'] = $currentOfficerId;
        $data['status'] = 'in_progress';
        
        $session = $this->repository->create($data);
        $this->autoSaveAttendance($session);
        event(new ActivitySessionCreated($session));

        return ['session' => $session, 'created' => true];
    }

    /**
     * External activities are typically one-off: create only one session per activity.
     * If a session already exists for the external activity, it is returned instead.
     *
     * @return array{session:mixed,created:bool}
     */
    public function getOrCreateExternalOneTimeSession(array $data): array
    {
        $activity = Activity::query()->findOrFail((int) $data['activity_id']);
        $activityId = (int) $activity->getKey();

        if (!$activity->is_active) {
            throw new RuntimeException('Cannot create a session for an inactive activity.');
        }
        if ($activity->activity_type !== 'external') {
            throw new RuntimeException('One-time session is only supported for external activities.');
        }

        $currentOfficerId = $this->currentOfficerId();
        $existing = $this->repository->findFirstByActivity($activityId, $currentOfficerId);
        if ($existing) {
            return ['session' => $existing, 'created' => false];
        }

        $data['created_by'] = $currentOfficerId;
        $data['supervising_officer_id'] = $currentOfficerId;
        $data['status'] = 'in_progress';

        $session = $this->repository->create($data);
        $this->autoSaveAttendance($session);
        event(new ActivitySessionCreated($session));

        return ['session' => $session, 'created' => true];
    }

    public function updateSession($id, array $data)
    {
        $allowedKeys = ['status'];
        $requestedKeys = array_keys($data);
        $disallowedKeys = array_diff($requestedKeys, $allowedKeys);

        if (!empty($disallowedKeys)) {
            throw new RuntimeException('Only the session status can be changed after creation.');
        }

        if (!array_key_exists('status', $data)) {
            throw new RuntimeException('A status value is required to update the session.');
        }

        $currentOfficerId = $this->currentOfficerId();
        $oldData = $this->repository->findById($id, $currentOfficerId)->toArray();
        $session = $this->repository->update($id, ['status' => $data['status']], $currentOfficerId);
        event(new ActivitySessionUpdated($session, $oldData));

        return $session;
    }

    public function deleteSession($id)
    {
        $session = $this->repository->findById($id, $this->currentOfficerId());
        if ($session->status === 'completed') {
            throw new RuntimeException('Completed sessions cannot be deleted.');
        }
        return $this->repository->delete($id, $this->currentOfficerId());
    }

    private function autoSaveAttendance($session): void
    {
        $assignedInmates = \App\Modules\Admissions\Models\InmateActivity::where('activity_id', $session->activity_id)
            ->whereNull('end_date')
            ->get();

        foreach ($assignedInmates as $assignment) {
            \App\Modules\ActivityAllocation\Models\SessionAttendance::firstOrCreate([
                'session_id' => $session->id,
                'inmate_id' => $assignment->inmate_id,
            ], [
                'admission_id' => $assignment->admission_id,
                'attendance_status' => 'present',
                'recorded_by' => $session->created_by,
                'recorded_at' => now(),
            ]);
        }
    }

    private function currentOfficerId(): int
    {
        $authenticatedUserId = auth()->id();

        if ($authenticatedUserId === null) {
            throw new RuntimeException('Authenticated officer is required.');
        }

        return (int) $authenticatedUserId;
    }
}
