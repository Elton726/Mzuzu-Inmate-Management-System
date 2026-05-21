<?php

namespace App\Modules\Visitation\Services;

use App\Modules\Visitation\Repositories\VisitationRuleRepository;
use App\Modules\Visitation\Models\VisitationRule;
use Illuminate\Support\Facades\Auth;

class VisitationRuleService
{
    public function __construct(private VisitationRuleRepository $repository) {}

    public function create(array $data)
    {
        return $this->repository->create(array_merge($data, ['created_by' => Auth::id()]));
    }

    public function update(int $id, array $data)
    {
        return $this->repository->update($id, $data);
    }

    public function delete(int $id)
    {
        return $this->repository->delete($id);
    }

    public function listForInmate(int $inmateId)
    {
        return $this->repository->forInmate($inmateId);
    }

    public function activeRulesForInmate(int $inmateId)
    {
        return $this->repository->activeRulesForInmate($inmateId);
    }

    public function checkNoVisitation(int $inmateId): bool
    {
        return $this->repository->activeRulesForInmate($inmateId)
            ->contains(fn (VisitationRule $rule) => $rule->rule_type === 'no_visitation');
    }
}
