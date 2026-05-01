<?php

namespace App\Modules\Visitation\Repositories;

use App\Modules\Visitation\Models\VisitationRule;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class VisitationRuleRepository
{
    public function create(array $data): VisitationRule
    {
        return VisitationRule::create($data);
    }

    public function findById(int $id): VisitationRule
    {
        return VisitationRule::findOrFail($id);
    }

    public function update(int $id, array $data): VisitationRule
    {
        $rule = $this->findById($id);
        $rule->update($data);

        return $rule;
    }

    public function delete(int $id): bool
    {
        $rule = $this->findById($id);

        return $rule->delete();
    }

    public function forInmate(int $inmateId)
    {
        return VisitationRule::where('inmate_id', $inmateId)
            ->orderByDesc('is_active')
            ->orderByDesc('created_at')
            ->get();
    }

    public function activeRulesForInmate(int $inmateId)
    {
        return VisitationRule::where('inmate_id', $inmateId)
            ->where('is_active', true)
            ->get();
    }
}
