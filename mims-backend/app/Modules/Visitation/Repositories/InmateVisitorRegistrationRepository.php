<?php

namespace App\Modules\Visitation\Repositories;

use App\Modules\Visitation\Models\InmateVisitorRegistration;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class InmateVisitorRegistrationRepository
{
    public function findById(int $id): InmateVisitorRegistration
    {
        return InmateVisitorRegistration::with(['visitor', 'inmate'])->findOrFail($id);
    }

    public function findActiveByInmate(int $inmateId, int $perPage = 15): LengthAwarePaginator
    {
        return InmateVisitorRegistration::with(['visitor'])
            ->where('inmate_id', $inmateId)
            ->where('is_active', true)
            ->orderBy('registered_date', 'desc')
            ->paginate($perPage);
    }

    public function findActiveByInmateAndVisitor(int $inmateId, int $visitorId): ?InmateVisitorRegistration
    {
        return InmateVisitorRegistration::where('inmate_id', $inmateId)
            ->where('visitor_id', $visitorId)
            ->where('is_active', true)
            ->first();
    }

    public function create(array $data): InmateVisitorRegistration
    {
        return InmateVisitorRegistration::create($data);
    }

    public function deactivate(int $id): InmateVisitorRegistration
    {
        $registration = $this->findById($id);
        $registration->update(['is_active' => false]);

        return $registration;
    }
}
