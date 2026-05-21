<?php

namespace App\Modules\Visitation\Repositories;

use App\Modules\Visitation\Models\Visitor;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class VisitorRepository
{
    public function all(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = Visitor::query();

        if (!empty($filters['search'])) {
            $search = sprintf('%%%s%%', $filters['search']);
            $query->where(function ($builder) use ($search) {
                $builder->where('first_name', 'ilike', $search)
                    ->orWhere('last_name', 'ilike', $search)
                    ->orWhere('national_id', 'ilike', $search)
                    ->orWhere('email', 'ilike', $search);
            });
        }

        if (isset($filters['national_id'])) {
            $query->where('national_id', $filters['national_id']);
        }

        if (isset($filters['is_approved'])) {
            $query->where('is_approved', filter_var($filters['is_approved'], FILTER_VALIDATE_BOOLEAN));
        }

        return $query->orderBy('last_name')->paginate($perPage);
    }

    public function findById(int $id): Visitor
    {
        return Visitor::with(['approvedBy', 'registrations.inmate'])->findOrFail($id);
    }

    public function create(array $data): Visitor
    {
        return Visitor::create($data);
    }

    public function update(int $id, array $data): Visitor
    {
        $visitor = $this->findById($id);
        $visitor->update($data);

        return $visitor;
    }

    public function delete(int $id): bool
    {
        $visitor = $this->findById($id);

        return $visitor->delete();
    }
}
