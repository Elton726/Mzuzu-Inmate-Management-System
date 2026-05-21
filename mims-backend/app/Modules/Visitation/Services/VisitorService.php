<?php

namespace App\Modules\Visitation\Services;

use App\Modules\Visitation\Events\VisitorApproved;
use App\Modules\Visitation\Events\VisitorRegistered;
use App\Modules\Visitation\Repositories\VisitorRepository;
use Illuminate\Support\Facades\Auth;
use RuntimeException;

class VisitorService
{
    public function __construct(private VisitorRepository $repository) {}

    public function list(array $filters = [], int $perPage = 15)
    {
        return $this->repository->all($filters, $perPage);
    }

    public function create(array $data)
    {
        $visitor = $this->repository->create(array_merge($data, ['is_approved' => false]));
        event(new VisitorRegistered($visitor, Auth::id(), request()->ip()));

        return $visitor;
    }

    public function approve(int $id)
    {
        $visitor = $this->repository->findById($id);

        if ($visitor->is_approved) {
            throw new RuntimeException('Visitor has already been approved.');
        }

        $visitor->update([
            'is_approved' => true,
            'approved_by' => Auth::id(),
            'approved_at' => now(),
        ]);

        event(new VisitorApproved($visitor, Auth::id(), request()->ip()));

        return $visitor->fresh();
    }

    public function show(int $id)
    {
        return $this->repository->findById($id);
    }

    public function update(int $id, array $data)
    {
        return $this->repository->update($id, $data);
    }

    public function delete(int $id)
    {
        return $this->repository->delete($id);
    }
}
