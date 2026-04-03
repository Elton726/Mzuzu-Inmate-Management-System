<?php

namespace App\Modules\ActivityAllocation\Repositories;

use App\Modules\ActivityAllocation\Models\ActivitySession;

class ActivitySessionRepository
{
    public function all($perPage = 15, $filters = [])
    {
        $query = ActivitySession::with(['activity', 'supervisingOfficer']);

        if (isset($filters['activity_id'])) {
            $query->where('activity_id', $filters['activity_id']);
        }
        if (isset($filters['session_date'])) {
            $query->where('session_date', $filters['session_date']);
        }
        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (isset($filters['supervising_officer_id'])) {
            $query->where('supervising_officer_id', $filters['supervising_officer_id']);
        }

        return $query->orderBy('session_date', 'desc')
                     ->orderBy('session_time')
                     ->paginate($perPage);
    }

    public function findById($id, ?int $officerId = null)
    {
        $query = ActivitySession::with(['activity', 'supervisingOfficer', 'attendances'])
            ->where('id', $id);

        if ($officerId !== null) {
            $query->where('supervising_officer_id', $officerId);
        }

        return $query->firstOrFail();
    }

    public function findByActivityAndDate(int $activityId, string $sessionDate, ?int $officerId = null): ?ActivitySession
    {
        $query = ActivitySession::with(['activity', 'supervisingOfficer'])
            ->where('activity_id', $activityId)
            ->whereDate('session_date', $sessionDate)
            ->orderBy('id');

        if ($officerId !== null) {
            $query->where('supervising_officer_id', $officerId);
        }

        return $query->first();
    }

    public function findFirstByActivity(int $activityId, ?int $officerId = null): ?ActivitySession
    {
        $query = ActivitySession::with(['activity', 'supervisingOfficer'])
            ->where('activity_id', $activityId)
            ->orderBy('id');

        if ($officerId !== null) {
            $query->where('supervising_officer_id', $officerId);
        }

        return $query->first();
    }

    public function create(array $data)
    {
        return ActivitySession::create($data);
    }

    public function update($id, array $data, ?int $officerId = null)
    {
        $session = $this->findById($id, $officerId);
        $session->update($data);
        return $session;
    }

    public function delete($id, ?int $officerId = null)
    {
        $session = $this->findById($id, $officerId);
        if ($session->attendances()->count() > 0) {
            throw new \Exception('Cannot delete session with recorded attendance');
        }
        return $session->delete();
    }

    public function getSessionsForOfficer($officerId, $limit = 10)
    {
        return ActivitySession::where('supervising_officer_id', $officerId)
            ->orderBy('session_date', 'desc')
            ->limit($limit)
            ->get();
    }
}
