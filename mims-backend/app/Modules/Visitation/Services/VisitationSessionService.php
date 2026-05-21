<?php

namespace App\Modules\Visitation\Services;

use App\Models\User;
use App\Modules\Admissions\Models\Admission;
use App\Modules\Admissions\Models\Inmate;
use App\Modules\Visitation\Events\CharityPDFGenerated;
use App\Modules\Visitation\Events\VisitationCancelled;
use App\Modules\Visitation\Events\VisitationCheckedIn;
use App\Modules\Visitation\Events\VisitationCheckedOut;
use App\Modules\Visitation\Events\VisitationDenied;
use App\Modules\Visitation\Events\VisitationScheduled;
use App\Modules\Visitation\Models\Visitor;
use App\Modules\Visitation\Repositories\InmateVisitorRegistrationRepository;
use App\Modules\Visitation\Repositories\VisitationSessionRepository;
use App\Modules\Visitation\Services\PDFService;
use App\Modules\Visitation\Services\VisitationRuleService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class VisitationSessionService
{
    public function __construct(
        private VisitationSessionRepository $repository,
        private VisitationRuleService $ruleService,
        private PDFService $pdfService,
        private InmateVisitorRegistrationRepository $registrationRepository,
    ) {}

    public function list(array $filters = [], int $perPage = 15)
    {
        return $this->repository->all($filters, $perPage);
    }

    public function get(int $id)
    {
        return $this->repository->findById($id);
    }

    public function schedule(array $data)
    {
        $visitor = Visitor::query()->findOrFail((int) $data['visitor_id']);
        if (!$visitor->is_approved) {
            throw new RuntimeException('Visitor must be approved before scheduling a visit.');
        }

        $inmate = Inmate::query()->findOrFail((int) $data['inmate_id']);
        $admission = Admission::query()->findOrFail((int) $data['admission_id']);

        if ($admission->inmate_id !== $inmate->id) {
            throw new RuntimeException('Admission record does not belong to the selected inmate.');
        }

        $registration = $this->registrationRepository->findActiveByInmateAndVisitor($inmate->id, $visitor->id);

        if (!$registration) {
            throw new RuntimeException('Visitor must be registered to this inmate before scheduling a visit.');
        }

        if ($this->ruleService->checkNoVisitation($inmate->id)) {
            throw new RuntimeException('This inmate is currently prohibited from having visits.');
        }

        $this->validateVisitDate($data['visit_date']);
        $this->validateVisitTime($data['visit_time']);

        $durationMinutes = (int) ($data['duration_minutes'] ?? 60);

        if ($this->repository->existsOverlappingSession($inmate->id, $data['visit_date'], $data['visit_time'], $durationMinutes)) {
            throw new RuntimeException('A visit already exists for this inmate during the requested time slot.');
        }

        $sessionPayload = [
            'inmate_id' => $inmate->id,
            'visitor_id' => $visitor->id,
            'admission_id' => $admission->id,
            'visit_date' => $data['visit_date'],
            'visit_time' => $data['visit_time'],
            'duration_minutes' => $durationMinutes,
            'location' => $data['location'] ?? null,
            'supervising_officer_id' => Auth::id(),
            'status' => 'scheduled',
            'visit_purpose' => $data['visit_purpose'] ?? null,
            'notes' => $data['notes'] ?? null,
            'is_charity_visit' => filter_var($data['is_charity_visit'] ?? false, FILTER_VALIDATE_BOOLEAN),
            'charity_organization' => $data['charity_organization'] ?? null,
            'charity_purpose' => $data['charity_purpose'] ?? null,
        ];

        if ($sessionPayload['is_charity_visit']) {
            if (empty($sessionPayload['charity_organization']) || empty($sessionPayload['charity_purpose'])) {
                throw new RuntimeException('Charity visits must include charity organization and purpose.');
            }
        }

        $session = DB::transaction(function () use ($sessionPayload) {
            $session = $this->repository->create($sessionPayload);
            event(new VisitationScheduled($session, Auth::id(), request()->ip()));

            if ($sessionPayload['is_charity_visit']) {
                $path = $this->pdfService->generateCharityRequestPdf($session);
                $session->update([
                    'pdf_file_path' => $path,
                    'pdf_generated_at' => now(),
                    'pdf_created_by' => Auth::id(),
                ]);
                event(new CharityPDFGenerated($session, Auth::id(), request()->ip()));
            }

            return $session;
        });

        return $this->repository->findById($session->id);
    }

    public function checkIn(int $id)
    {
        $session = $this->repository->findById($id);
        if ($session->status !== 'scheduled') {
            throw new RuntimeException('Only scheduled sessions can be checked in.');
        }

        $session->update([
            'status' => 'in_progress',
            'checked_in_at' => now(),
        ]);

        event(new VisitationCheckedIn($session, Auth::id(), request()->ip()));

        return $session;
    }

    public function checkOut(int $id)
    {
        $session = $this->repository->findById($id);
        if ($session->status !== 'in_progress') {
            throw new RuntimeException('Only in-progress sessions can be checked out.');
        }

        $session->update([
            'status' => 'completed',
            'checked_out_at' => now(),
        ]);

        event(new VisitationCheckedOut($session, Auth::id(), request()->ip()));

        return $session;
    }

    public function cancel(int $id)
    {
        $session = $this->repository->findById($id);

        if (in_array($session->status, ['completed', 'cancelled'], true)) {
            throw new RuntimeException('A completed or already cancelled session cannot be cancelled.');
        }

        $session->update(['status' => 'cancelled']);
        event(new VisitationCancelled($session, Auth::id(), request()->ip()));

        return $session;
    }

    public function deny(int $id, string $reason, ?string $notes = null)
    {
        $session = $this->repository->findById($id);

        if ($session->status === 'completed') {
            throw new RuntimeException('A completed session cannot be denied.');
        }

        $denial = $session->denial()->create([
            'reason' => $reason,
            'denied_by' => Auth::id(),
            'denial_date' => now(),
            'notes' => $notes,
        ]);

        $session->update(['status' => 'cancelled']);
        event(new VisitationDenied($session, $denial, Auth::id(), request()->ip()));

        return $session->fresh();
    }

    private function validateVisitDate(string $date): void
    {
        $visitDate = Carbon::parse($date)->startOfDay();

        if ($visitDate->isBefore(today())) {
            throw new RuntimeException('Visit date must be today or in the future.');
        }
    }

    private function validateVisitTime(string $time): void
    {
        $visitTime = Carbon::parse($time);
        $opening = Carbon::parse('09:00');
        $closing = Carbon::parse('17:00');

        if ($visitTime->lt($opening) || $visitTime->gt($closing)) {
            throw new RuntimeException('Visit time must be within prison visitation hours (09:00-17:00).');
        }
    }
}
