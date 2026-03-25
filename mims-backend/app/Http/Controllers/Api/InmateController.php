<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inmates\CheckDuplicateRequest;
use App\Http\Requests\Inmates\StoreInmateRequest;
use App\Http\Requests\Inmates\UpdateInmateRequest;
use App\Models\Inmate;
use App\Services\DuplicateDetectionService;
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

    public function search(Request $request)
    {
        $request->validate([
            'q' => ['required', 'string', 'min:2'],
        ]);

        $q = $request->string('q')->toString();

        $query = Inmate::query()
            ->where('prison_number', 'like', "%{$q}%")
            ->orWhere('first_name', 'like', "%{$q}%")
            ->orWhere('last_name', 'like', "%{$q}%")
            ->orWhere('national_id', 'like', "%{$q}%");

        return response()->json($query->orderBy('id', 'desc')->paginate(25));
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

