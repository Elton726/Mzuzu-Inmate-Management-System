<?php

namespace App\Modules\Admissions\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Admissions\Models\Activity;
use App\Modules\Admissions\Models\Admission;
use App\Modules\Admissions\Models\Document;
use App\Modules\Admissions\Models\Inmate;
use App\Modules\Admissions\Models\InmateActivity;
use App\Modules\Admissions\Requests\Admissions\StoreAdmissionRequest;
use App\Modules\Admissions\Services\ActivityAssignmentService;
use App\Services\AuditLogService;
use App\Modules\Admissions\Services\CellAllocationService;
use App\Modules\Admissions\Services\OffenceClassificationService;
use App\Modules\Admissions\Services\SentenceCalculationService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdmissionController extends Controller
{
    public function __construct(
        private readonly SentenceCalculationService $sentenceCalculationService,
        private readonly OffenceClassificationService $offenceClassificationService,
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

        $currentAdmission = $inmate->currentAdmission()->first();
        $isTransitionFromRemand = false;

        if ($currentAdmission) {
            if (in_array($currentAdmission->inmate_type, ['remandee', 'murder_remandee']) && $validated['inmate_type'] === 'convict') {
                $isTransitionFromRemand = true;
            } else {
                abort(422, 'Inmate already has an active admission. Complete the current admission before creating a new one.');
            }
        }

        if (!$isTransitionFromRemand && $inmate->admissions()->exists()) {
            $latestAdmission = $inmate->admissions()->orderBy('created_at', 'desc')->first();
            if ($latestAdmission && in_array($latestAdmission->inmate_type, ['remandee', 'murder_remandee']) && $validated['inmate_type'] === 'convict') {
                // allowed
            } else {
                abort(422, 'This inmate already has a completed admission and cannot be admitted again through this flow.');
            }
        }

        $validated['admission_type'] = $inmate->admissions()->exists() ? 'repeat' : 'first_time';

        $admission = DB::transaction(function () use ($validated, $inmate, $user, $request, $isTransitionFromRemand) {
            if ($isTransitionFromRemand) {
                $inmate->currentAdmission()->update(['is_current' => false]);
            }
            $projectedReleaseDate = null;
            $remandDurationDays = null;
            if ($validated['inmate_type'] === 'convict') {
                $projectedReleaseDate = $this->sentenceCalculationService->calculateProjectedReleaseDate(
                    CarbonImmutable::parse($validated['sentence_start_date']),
                    (int) $validated['sentence_years'],
                    (int) ($validated['sentence_months'] ?? 0),
                    (int) ($validated['sentence_days'] ?? 0),
                )->toDateString();
            } else {
                $admissionDate = CarbonImmutable::parse($validated['admission_date'])->startOfDay();
                $nextCourtDate = CarbonImmutable::parse($validated['remand_next_court_date'])->startOfDay();

                if ($nextCourtDate->lessThanOrEqualTo($admissionDate)) {
                    abort(422, 'Next court date must be after the admission date for remandees.');
                }

                $remandDurationDays = (int) $admissionDate->diffInDays($nextCourtDate);
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
                'sentence_days' => $validated['sentence_days'] ?? null,
                'sentence_start_date' => $validated['sentence_start_date'] ?? null,
                'projected_release_date' => $projectedReleaseDate,
                'original_release_date' => $projectedReleaseDate,
                'remand_next_court_date' => $validated['remand_next_court_date'] ?? null,
                'remand_duration_days' => $remandDurationDays,
                'admitted_by' => $user->id,
                'is_current' => true,
            ]);

            $classification = $validated['inmate_type'] === 'convict'
                ? $this->offenceClassificationService->getClassificationForConvict($validated['offence_description'] ?? null)
                : $this->mapInmateTypeToSecurityClassification($validated['inmate_type']);
            $gender = in_array($inmate->gender, ['male', 'female'], true) ? $inmate->gender : null;
            $cell = $this->cellAllocationService->findAvailableCell($classification, $gender);

            if (!$cell) {
                $genderText = $gender ? " {$gender}" : '';
                abort(422, "No available{$genderText} {$classification} security cell could be found for automatic allocation.");
            }

            $this->cellAllocationService->allocate($inmate->id, $admission->id, $cell->id);

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

        return response()->json($admission->load(
            'inmate',
            'cellAllocations.cell',
            'inmateActivities.activity.latestSession.supervisingOfficer',
            'documents'
        ), 201);
    }

    public function show(Admission $admission)
    {
        return response()->json($admission->load(
            'inmate',
            'cellAllocations.cell',
            'inmateActivities.activity.latestSession.supervisingOfficer',
            'documents',
            'admittedBy'
        ));
    }

    public function updateSentenceLength(Request $request, Admission $admission)
    {
        $validated = $request->validate([
            'sentence_years' => ['required', 'integer', 'min:0'],
            'sentence_months' => ['nullable', 'integer', 'min:0', 'max:11'],
            'sentence_days' => ['nullable', 'integer', 'min:0', 'max:30'],
        ]);

        if (!$admission->is_current || $admission->released_at !== null) {
            abort(422, 'Sentence length can only be changed for current unreleased admissions.');
        }

        if ($admission->inmate_type !== 'convict' || $admission->sentence_start_date === null) {
            abort(422, 'Sentence length can only be changed for convicted inmates with a sentence start date.');
        }

        $updatedAdmission = DB::transaction(function () use ($validated, $admission, $request) {
            $before = $admission->toArray();
            $sentenceYears = (int) $validated['sentence_years'];
            $sentenceMonths = (int) ($validated['sentence_months'] ?? 0);
            $sentenceDays = (int) ($validated['sentence_days'] ?? 0);

            $baseReleaseDate = $this->sentenceCalculationService->calculateProjectedReleaseDate(
                CarbonImmutable::parse($admission->sentence_start_date),
                $sentenceYears,
                $sentenceMonths,
                $sentenceDays,
            );

            $adjustmentDays = (int) $admission->sentenceAdjustments()->sum('adjustment_days');
            $projectedReleaseDate = $baseReleaseDate->subDays($adjustmentDays)->toDateString();

            $admission->update([
                'sentence_years' => $sentenceYears,
                'sentence_months' => $sentenceMonths,
                'sentence_days' => $sentenceDays,
                'original_release_date' => $baseReleaseDate->toDateString(),
                'projected_release_date' => $projectedReleaseDate,
            ]);

            $this->auditLogService->log(
                $request->user()?->id,
                'UPDATE',
                'admissions',
                $admission->id,
                $before,
                $admission->fresh()->toArray(),
                $request->ip(),
            );

            return $admission->fresh('inmate');
        });

        return response()->json([
            'message' => 'Sentence length updated successfully.',
            'admission' => $updatedAdmission,
        ]);
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
