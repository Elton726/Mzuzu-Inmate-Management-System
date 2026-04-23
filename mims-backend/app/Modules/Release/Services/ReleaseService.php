<?php

namespace App\Modules\Release\Services;

use App\Modules\Admissions\Models\Admission;
use App\Modules\Release\Events\ReleaseApproved;
use App\Modules\Release\Events\ReleaseCancelled;
use App\Modules\Release\Events\ReleaseConfirmed;
use App\Modules\Release\Models\ReleaseWorkflow;
use App\Modules\Release\Repositories\ReleaseWorkflowRepository;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Collection;
use RuntimeException;

class ReleaseService
{
    public function __construct(
        protected ReleaseWorkflowRepository $repository
    ) {}

    public function getEligibleInmates(): Collection
    {
        return $this->repository->getEligibleInmates();
    }

    public function getPendingReleases(): Collection
    {
        return $this->repository->getPendingForGatekeeper();
    }

    public function approveRelease(int $admissionId, int $approverId, ?string $notes = null, ?string $ipAddress = null): ReleaseWorkflow
    {
        $admission = $this->loadEligibleAdmission($admissionId);

        if ($this->repository->findActiveByAdmission($admissionId)) {
            throw new RuntimeException('An active release workflow already exists for this admission.');
        }

        $workflow = $this->repository->createApproval([
            'admission_id' => $admissionId,
            'approved_by' => $approverId,
            'approved_at' => now(),
            'approval_notes' => $notes,
            'status' => 'approved',
        ])->load([
            'admission.inmate',
            'approver:id,name',
        ]);

        event(new ReleaseApproved($workflow, $approverId, $ipAddress));

        return $workflow;
    }

    public function confirmRelease(int $workflowId, int $gatekeeperId, ?string $notes = null, ?string $ipAddress = null): ReleaseWorkflow
    {
        $workflow = $this->repository->findById($workflowId);

        if ($workflow->status !== 'approved') {
            throw new RuntimeException('Only approved releases can be confirmed.');
        }

        $oldData = $workflow->toArray();

        try {
            $updated = $this->repository->updateToConfirmed($workflow, [
                'status' => 'confirmed',
                'confirmed_by' => $gatekeeperId,
                'confirmed_at' => now(),
                'confirmation_notes' => $notes,
            ]);
        } catch (QueryException $e) {
            throw new RuntimeException($this->normalizeDatabaseError($e), previous: $e);
        }

        event(new ReleaseConfirmed($updated, $gatekeeperId, $ipAddress, $oldData));

        return $updated;
    }

    public function cancelRelease(int $workflowId, int $cancellerId, ?string $reason = null, ?string $ipAddress = null): ReleaseWorkflow
    {
        $workflow = $this->repository->findById($workflowId);

        if ($workflow->status === 'confirmed') {
            throw new RuntimeException('Confirmed releases cannot be cancelled.');
        }

        $oldData = $workflow->toArray();

        $updated = $this->repository->cancel($workflow, [
            'status' => 'cancelled',
            'cancelled_by' => $cancellerId,
            'cancelled_at' => now(),
            'cancellation_reason' => $reason,
        ]);

        event(new ReleaseCancelled($updated, $cancellerId, $ipAddress, $oldData));

        return $updated;
    }

    private function loadEligibleAdmission(int $admissionId): Admission
    {
        $admission = Admission::query()->with('inmate')->findOrFail($admissionId);

        if (!$admission->is_current || $admission->released_at !== null) {
            throw new RuntimeException('Only current unreleased admissions can enter the release workflow.');
        }

        if ($admission->projected_release_date === null) {
            throw new RuntimeException('This admission does not have a projected release date.');
        }

        $cutoff = CarbonImmutable::today()->addDays(30);
        if ($admission->projected_release_date->greaterThan($cutoff)) {
            throw new RuntimeException('This inmate is not yet eligible for release approval.');
        }

        return $admission;
    }

    private function normalizeDatabaseError(QueryException $e): string
    {
        $message = $e->getMessage();

        if (str_contains($message, 'Release already confirmed for this admission')) {
            return 'Release already confirmed for this admission.';
        }

        if (str_contains($message, 'Only a gatekeeper or admin can confirm a release')) {
            return 'Only a gatekeeper or admin can confirm a release.';
        }

        return 'Unable to confirm this release.';
    }
}
