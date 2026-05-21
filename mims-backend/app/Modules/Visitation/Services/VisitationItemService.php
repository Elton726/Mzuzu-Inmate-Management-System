<?php

namespace App\Modules\Visitation\Services;

use App\Modules\Visitation\Repositories\VisitationItemRepository;
use Illuminate\Support\Facades\Auth;

class VisitationItemService
{
    public function __construct(private VisitationItemRepository $repository) {}

    public function add(array $data)
    {
        return $this->repository->create(array_merge($data, ['quantity' => (int) ($data['quantity'] ?? 1)]));
    }

    public function inspect(int $id, array $data)
    {
        return $this->repository->update($id, [
            'inspected_by' => Auth::id(),
            'is_approved' => filter_var($data['is_approved'], FILTER_VALIDATE_BOOLEAN),
            'inspection_notes' => $data['inspection_notes'] ?? null,
        ]);
    }
}
