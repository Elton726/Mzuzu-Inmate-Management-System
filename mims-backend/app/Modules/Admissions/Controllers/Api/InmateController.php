<?php

namespace App\Modules\Admissions\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Admissions\Models\Inmate;
use App\Modules\Admissions\Requests\Inmates\CheckDuplicateRequest;
use App\Modules\Admissions\Requests\Inmates\StoreInmateRequest;
use App\Modules\Admissions\Requests\Inmates\UpdateInmateRequest;
use App\Modules\Admissions\Services\DuplicateDetectionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InmateController extends Controller
{
    public function __construct(private readonly DuplicateDetectionService $duplicateDetectionService)
    {
        $this->middleware('auth:sanctum');
    }

    public function checkDuplicate(CheckDuplicateRequest $request)
    {
        $matches = $this->duplicateDetectionService->findPotentialDuplicates($request->validated());

        return response()->json([
            'has_duplicates' => $matches->isNotEmpty(),
            'matches' => $matches,
        ]);
    }

    public function index(Request $request)
    {
        $request->validate([
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'sort_by' => ['nullable', 'string', 'in:id,prison_number,first_name,last_name,date_of_birth,status'],
            'sort_order' => ['nullable', 'string', 'in:asc,desc'],
        ]);

        $perPage = $request->integer('per_page', 25);
        $sortBy = $request->string('sort_by', 'id')->toString();
        $sortOrder = $request->string('sort_order', 'desc')->toString();

        $query = Inmate::query()
            ->where('status', '<>', 'released')
            ->withCount('admissions')
            ->with(['currentAdmission:id,inmate_id,is_current,admission_date,inmate_type,case_number,sentence_years,sentence_months,sentence_start_date,projected_release_date,original_release_date,released_at']);

        return response()->json($query->orderBy($sortBy, $sortOrder)->paginate($perPage));
    }

    public function search(Request $request)
    {
        $request->validate([
            'q' => ['required', 'string', 'min:2'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $q = $request->string('q')->toString();
        $perPage = $request->integer('per_page', 25);

        $query = Inmate::query()
            ->where('status', '<>', 'released')
            ->withCount('admissions')
            ->with(['currentAdmission:id,inmate_id,is_current,admission_date,inmate_type,case_number,sentence_years,sentence_months,sentence_start_date,projected_release_date,original_release_date,released_at'])
            ->where(function ($builder) use ($q) {
                $builder
                    ->where('prison_number', 'like', "%{$q}%")
                    ->orWhere('first_name', 'like', "%{$q}%")
                    ->orWhere('last_name', 'like', "%{$q}%")
                    ->orWhere('national_id', 'like', "%{$q}%");
            });

        return response()->json($query->orderBy('id', 'desc')->paginate($perPage));
    }

    public function store(StoreInmateRequest $request)
    {
        $validated = $request->validated();

        $inmate = DB::transaction(function () use ($validated) {
            $year = now()->year;
            $nextSequence = (int) (Inmate::max('id') ?? 0) + 1;
            $prisonNumber = sprintf('MIMS/%d/%05d', $year, $nextSequence);

            return Inmate::create([
                ...$validated,
                'prison_number' => $prisonNumber,
                'status' => 'active',
            ]);
        });

        return response()->json($inmate, 201);
    }

    public function show(Inmate $inmate)
    {
        if ($inmate->status === 'released') {
            return response()->json(['error' => 'Inmate profile not available.'], 404);
        }

        return response()->json($inmate->load('currentAdmission', 'documents'));
    }

    public function update(UpdateInmateRequest $request, Inmate $inmate)
    {
        $inmate->update($request->validated());

        return response()->json([
            'message' => 'Inmate updated successfully.',
            'inmate' => $inmate->fresh(),
        ]);
    }
}
