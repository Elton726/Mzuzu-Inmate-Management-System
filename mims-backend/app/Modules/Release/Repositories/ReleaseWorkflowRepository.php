<?php

namespace App\Modules\Release\Repositories;

use App\Modules\Release\Models\ReleaseWorkflow;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;

class ReleaseWorkflowRepository
{
    public function getEligibleInmates(): Collection
    {
        return collect(DB::table('inmates_due_for_release')->get());
    }

    public function getPendingForGatekeeper(): Collection
    {
        return ReleaseWorkflow::query()
            ->approved()
            ->with([
                'admission.inmate',
                'approver:id,name',
            ])
            ->orderBy('approved_at')
            ->get();
    }

    public function findById(int $id): ReleaseWorkflow
    {
        return ReleaseWorkflow::query()
            ->with([
                'admission.inmate',
                'approver:id,name',
                'confirmer:id,name',
                'canceller:id,name',
            ])
            ->findOrFail($id);
    }

    public function findActiveByAdmission(int $admissionId): ?ReleaseWorkflow
    {
        return ReleaseWorkflow::query()
            ->where('admission_id', $admissionId)
            ->whereIn('status', ['approved', 'confirmed'])
            ->latest('id')
            ->first();
    }

    public function createApproval(array $data): ReleaseWorkflow
    {
        return ReleaseWorkflow::query()->create($data);
    }

    public function updateToConfirmed(ReleaseWorkflow $workflow, array $data): ReleaseWorkflow
    {
        $workflow->update($data);

        return $workflow->refresh()->load([
            'admission.inmate',
            'approver:id,name',
            'confirmer:id,name',
        ]);
    }

    public function cancel(ReleaseWorkflow $workflow, array $data): ReleaseWorkflow
    {
        $workflow->update($data);

        return $workflow->refresh()->load([
            'admission.inmate',
            'approver:id,name',
            'canceller:id,name',
        ]);
    }
}
