<?php

namespace App\Modules\Visitation\Repositories;

use App\Modules\Visitation\Models\VisitationSession;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;

class VisitationSessionRepository
{
    public function all(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = VisitationSession::with(['inmate', 'visitor', 'admission', 'supervisingOfficer', 'denial', 'items']);

        if (isset($filters['inmate_id'])) {
            $query->where('inmate_id', $filters['inmate_id']);
        }

        if (isset($filters['visitor_id'])) {
            $query->where('visitor_id', $filters['visitor_id']);
        }

        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (isset($filters['search'])) {
            $search = strtolower(trim((string) $filters['search']));
            $like = "%{$search}%";

            $query->where(function ($builder) use ($like) {
                $builder
                    ->whereHas('inmate', function ($inmateQuery) use ($like) {
                        $inmateQuery
                            ->whereRaw('LOWER(prison_number) LIKE ?', [$like])
                            ->orWhereRaw('LOWER(first_name) LIKE ?', [$like])
                            ->orWhereRaw('LOWER(last_name) LIKE ?', [$like])
                            ->orWhereRaw('LOWER(other_names) LIKE ?', [$like]);
                    })
                    ->orWhereHas('visitor', function ($visitorQuery) use ($like) {
                        $visitorQuery
                            ->whereRaw('LOWER(first_name) LIKE ?', [$like])
                            ->orWhereRaw('LOWER(last_name) LIKE ?', [$like])
                            ->orWhereRaw('LOWER(contact_number) LIKE ?', [$like])
                            ->orWhereRaw('LOWER(national_id) LIKE ?', [$like]);
                    });
            });
        }

        if (isset($filters['is_charity_visit'])) {
            $query->where('is_charity_visit', filter_var($filters['is_charity_visit'], FILTER_VALIDATE_BOOLEAN));
        }

        if (isset($filters['start_date'])) {
            $query->whereDate('visit_date', '>=', $filters['start_date']);
        }

        if (isset($filters['end_date'])) {
            $query->whereDate('visit_date', '<=', $filters['end_date']);
        }

        return $query->orderBy('visit_date', 'desc')->orderBy('visit_time')->paginate($perPage);
    }

    public function findById(int $id): VisitationSession
    {
        return VisitationSession::with(['inmate', 'visitor', 'admission', 'supervisingOfficer', 'denial', 'items'])->findOrFail($id);
    }

    public function create(array $data): VisitationSession
    {
        return VisitationSession::create($data);
    }

    public function update(int $id, array $data): VisitationSession
    {
        $session = $this->findById($id);
        $session->update($data);

        return $session;
    }

    public function existsOverlappingSession(int $inmateId, string $visitDate, string $visitTime, int $durationMinutes, ?int $excludeSessionId = null): bool
    {
        $startTime = Carbon::parse($visitTime);
        $endTime = $startTime->copy()->addMinutes($durationMinutes);

        $query = VisitationSession::query()
            ->where('inmate_id', $inmateId)
            ->whereDate('visit_date', $visitDate)
            ->whereNotIn('status', ['cancelled', 'no_show']);

        if ($excludeSessionId) {
            $query->where('id', '<>', $excludeSessionId);
        }

        $sessions = $query->get(['visit_time', 'duration_minutes']);

        foreach ($sessions as $session) {
            $sessionStart = Carbon::parse($session->visit_time);
            $sessionEnd = $sessionStart->copy()->addMinutes((int) ($session->duration_minutes ?? 0));

            if ($startTime < $sessionEnd && $endTime > $sessionStart) {
                return true;
            }
        }

        return false;
    }
}
