<?php

namespace App\Modules\Visitation\Services;

use App\Modules\Admissions\Models\Inmate;
use App\Modules\Visitation\Repositories\InmateVisitorRegistrationRepository;
use App\Modules\Visitation\Repositories\VisitorRepository;
use RuntimeException;

class InmateVisitorRegistrationService
{
    public function __construct(
        private InmateVisitorRegistrationRepository $repository,
        private VisitorRepository $visitorRepository,
    ) {}

    public function register(array $data)
    {
        $visitor = $this->visitorRepository->findById((int) $data['visitor_id']);
        if (!$visitor->is_approved) {
            throw new RuntimeException('Only approved visitors can be registered for inmates.');
        }

        Inmate::query()->findOrFail((int) $data['inmate_id']);

        $existingRegistration = $this->repository->findActiveByInmateAndVisitor((int) $data['inmate_id'], (int) $data['visitor_id']);
        if ($existingRegistration) {
            throw new RuntimeException('This visitor is already actively registered to the selected inmate.');
        }

        return $this->repository->create([
            'inmate_id' => $data['inmate_id'],
            'visitor_id' => $data['visitor_id'],
            'registered_date' => now()->toDateString(),
            'is_active' => true,
            'notes' => $data['notes'] ?? null,
        ]);
    }

    public function listForInmate(int $inmateId, int $perPage = 15)
    {
        return $this->repository->findActiveByInmate($inmateId, $perPage);
    }

    public function deactivate(int $id)
    {
        return $this->repository->deactivate($id);
    }
}
