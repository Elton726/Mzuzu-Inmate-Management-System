<?php

namespace App\Modules\Admissions\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Admissions\Models\Activity;
use App\Modules\Admissions\Models\Admission;
use App\Modules\Admissions\Models\Cell;
use App\Modules\Admissions\Models\Document;
use App\Modules\Admissions\Models\Inmate;
use App\Modules\Admissions\Models\InmateActivity;
use App\Modules\Admissions\Requests\Admissions\StoreAdmissionRequest;
use App\Modules\Admissions\Services\ActivityAssignmentService;
use App\Services\AuditLogService;
use App\Modules\Admissions\Services\CellAllocationService;
use App\Modules\Admissions\Services\SentenceCalculationService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class AdmissionController extends Controller
{
    public function __construct(
        private readonly SentenceCalculationService $sentenceCalculationService,
        private readonly CellAllocationService $cellAllocationService,
        private readonly ActivityAssignmentService $activityAssignmentService,
        private readonly AuditLogService $auditLogService,
    ) {
        $this->middleware('auth:sanctum');
    }

    public function store(StoreAdmissionRequest $request)
    {
        $validated = $request->validated();
        $user = $request->user();

        $inmate = Inmate::findOrFail($validated['inmate_id']);

        if ($inmate->currentAdmission()->exists()) {
            abort(422, 'Inmate already has an active admission. Complete the current admission before creating a new one.');
        }

        $admission = DB::transaction(function () use ($validated, $inmate, $user, $request) {
            if ($validated['admission_type'] === 'repeat') {
                Admission::where('inmate_id', $inmate->id)->where('is_current', true)->update(['is_current' => false]);
            }

            $projectedReleaseDate = null;
            if ($validated['inmate_type'] === 'convict') {
                $projectedReleaseDate = $this->sentenceCalculationService->calculateProjectedReleaseDate(
                    CarbonImmutable::parse($validated['sentence_start_date']),
                    (int) $validated['sentence_years'],
                    (int) ($validated['sentence_months'] ?? 0),
                )->toDateString();
            }

            $admission = Admission::create([
                'inmate_id' => $inmate->id,
                'admission_date' => $validated['admission_date'],
                'admission_type' => $validated['admission_type'],
                'inmate_type' => $validated['inmate_type'],
                'case_number' => $validated['case_number'],
                'court_name' => $validated['court_name'] ?? null,
                'offence_description' => $validated['offence_description'] ?? null,
                'sentence_years' => $validated['sentence_years'] ?? null,
                'sentence_months' => $validated['sentence_months'] ?? null,
                'sentence_start_date' => $validated['sentence_start_date'] ?? null,
                'projected_release_date' => $projectedReleaseDate,
                'remand_next_court_date' => $validated['remand_next_court_date'] ?? null,
                'admitted_by' => $user->id,
                'is_current' => true,
            ]);

            $cell = null;
            if (!empty($validated['cell_id'])) {
                $cell = Cell::lockForUpdate()->findOrFail($validated['cell_id']);
                if ($cell->status !== 'available' || $cell->current_occupancy >= $cell->capacity) {
                    abort(422, 'Selected cell is not available.');
                }
            } else {
                $classification = $this->mapInmateTypeToSecurityClassification($validated['inmate_type']);
                $cell = $this->cellAllocationService->findAvailableCell($classification);
            }

            if ($cell) {
                $this->cellAllocationService->allocate($inmate->id, $admission->id, $cell->id);
            }

            if (!empty($validated['activity_id'])) {
                InmateActivity::create([
                    'inmate_id' => $inmate->id,
                    'admission_id' => $admission->id,
                    'activity_id' => $validated['activity_id'],
                    'assigned_date' => now()->toDateString(),
                    'assigned_by' => $user->id,
                ]);
            } else {
                $this->activityAssignmentService->autoAssign(
                    $inmate->id,
                    $admission->id,
                    $user->id,
                    [
                        'inmate_type' => $validated['inmate_type'],
                        'sentence_years' => $validated['sentence_years'] ?? 0,
                    ],
                );
            }

            $this->linkAdmissionDocuments($admission, $inmate, $validated);

            $this->auditLogService->log(
                $user->id,
                'INSERT',
                'admissions',
                $admission->id,
                null,
                $admission->toArray(),
                $request->ip(),
            );

            return $admission;
        });

        return response()->json($admission->load('inmate', 'cellAllocations.cell', 'inmateActivities.activity', 'documents'), 201);
    }

    public function show(Admission $admission)
    {
        return response()->json($admission->load('inmate', 'cellAllocations.cell', 'inmateActivities.activity', 'documents', 'admittedBy'));
    }

    private function mapInmateTypeToSecurityClassification(string $inmateType): string
    {
        return match ($inmateType) {
            'murder_remandee' => 'maximum',
            'convict' => 'medium',
            default => 'minimum',
        };
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function linkAdmissionDocuments(Admission $admission, Inmate $inmate, array $validated): void
    {
        if (!empty($validated['committal_warrant_id'])) {
            $doc = Document::findOrFail($validated['committal_warrant_id']);
            if ($doc->inmate_id !== $inmate->id) {
                abort(422, 'Committal warrant document does not belong to this inmate.');
            }
            $doc->update(['admission_id' => $admission->id]);
            $admission->committal_warrant_path = $doc->file_path;
        }

        if (!empty($validated['remand_warrant_id'])) {
            $doc = Document::findOrFail($validated['remand_warrant_id']);
            if ($doc->inmate_id !== $inmate->id) {
                abort(422, 'Remand warrant document does not belong to this inmate.');
            }
            $doc->update(['admission_id' => $admission->id]);
            $admission->remand_warrant_path = $doc->file_path;
        }

        $admission->save();
    }
}
