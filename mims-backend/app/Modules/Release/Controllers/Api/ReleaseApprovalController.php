<?php

namespace App\Modules\Release\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Release\Requests\ApproveReleaseRequest;
use App\Modules\Release\Requests\CancelReleaseRequest;
use App\Modules\Release\Services\ReleaseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ReleaseApprovalController extends Controller
{
    public function __construct(
        protected ReleaseService $releaseService
    ) {}

    public function index(Request $request)
    {
        $validated = $request->validate([
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
            'q' => ['nullable', 'string', 'min:2'],
        ]);

        $perPage = $validated['per_page'] ?? 25;
        $query = $validated['q'] ?? null;

        $releases = $this->releaseService->getEligibleInmates();

        if ($query) {
            $releases = $releases->filter(function ($inmate) use ($query) {
                return str_contains(strtolower($inmate->first_name . ' ' . $inmate->last_name), strtolower($query))
                    || str_contains(strtolower($inmate->prison_number), strtolower($query));
            });
        }

        return response()->json([
            'data' => $releases->slice(($request->integer('page', 1) - 1) * $perPage, $perPage)->values(),
            'total' => $releases->count(),
            'per_page' => $perPage,
            'current_page' => $request->integer('page', 1),
            'last_page' => ceil($releases->count() / $perPage),
        ]);
    }

    public function store(ApproveReleaseRequest $request)
    {
        try {
            $workflow = $this->releaseService->approveRelease(
                (int) $request->integer('admission_id'),
                (int) $request->user()->id,
                $request->string('notes')->toString() ?: null,
                $request->ip(),
            );

            return response()->json($workflow, 201);
        } catch (RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    public function destroy(int $workflowId, CancelReleaseRequest $request)
    {
        try {
            $this->releaseService->cancelRelease(
                $workflowId,
                (int) $request->user()->id,
                $request->string('reason')->toString() ?: null,
                $request->ip(),
            );

            return response()->json(null, 204);
        } catch (RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    public function history(Request $request)
    {
        $validated = $request->validate([
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
            'q' => ['nullable', 'string', 'min:2'],
            'status' => ['nullable', 'string', 'in:approved,confirmed,cancelled'],
        ]);

        $perPage = $validated['per_page'] ?? 25;
        $page = $validated['page'] ?? 1;
        $query = $validated['q'] ?? null;
        $status = $validated['status'] ?? null;

        $releaseHistory = DB::table('release_history')
            ->orderByDesc('approved_at');

        if ($status) {
            $releaseHistory = $releaseHistory->where('status', $status);
        }

        if ($query) {
            $releaseHistory = $releaseHistory->where(function ($q) use ($query) {
                $q->where('first_name', 'like', "%{$query}%")
                    ->orWhere('last_name', 'like', "%{$query}%")
                    ->orWhere('prison_number', 'like', "%{$query}%");
            });
        }

        return response()->json($releaseHistory->paginate($perPage, ['*'], 'page', $page));
    }

    public function confirmed(Request $request)
    {
        $validated = $request->validate([
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
            'q' => ['nullable', 'string', 'min:2'],
        ]);

        $perPage = $validated['per_page'] ?? 25;
        $page = $validated['page'] ?? 1;
        $query = $validated['q'] ?? null;

        $releaseHistory = DB::table('release_history')
            ->where('status', 'confirmed')
            ->orderByDesc('confirmed_at');

        if ($query) {
            $releaseHistory = $releaseHistory->where(function ($q) use ($query) {
                $q->where('first_name', 'like', "%{$query}%")
                    ->orWhere('last_name', 'like', "%{$query}%")
                    ->orWhere('prison_number', 'like', "%{$query}%");
            });
        }

        return response()->json($releaseHistory->paginate($perPage, ['*'], 'page', $page));
    }

    public function exportHistory(Request $request)
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'min:2'],
            'status' => ['nullable', 'string', 'in:approved,confirmed,cancelled'],
            'format' => ['required', 'string', 'in:csv'],
        ]);

        $query = $validated['q'] ?? null;
        $status = $validated['status'] ?? null;
        $format = $validated['format'];

        $releaseHistory = DB::table('release_history')
            ->orderByDesc('approved_at');

        if ($status) {
            $releaseHistory = $releaseHistory->where('status', $status);
        }

        if ($query) {
            $releaseHistory = $releaseHistory->where(function ($q) use ($query) {
                $q->where('first_name', 'like', "%{$query}%")
                    ->orWhere('last_name', 'like', "%{$query}%")
                    ->orWhere('prison_number', 'like', "%{$query}%");
            });
        }

        $records = $releaseHistory->get();

        if ($format === 'csv') {
            $csv = "Inmate Name,Prison Number,Status,Approved By,Approved At,Confirmed By,Confirmed At\n";
            foreach ($records as $record) {
                $csv .= sprintf(
                    '"%s","%s","%s","%s","%s","%s","%s"' . "\n",
                    $record->first_name . ' ' . $record->last_name,
                    $record->prison_number,
                    $record->status,
                    $record->approved_by_name ?? '',
                    $record->approved_at ?? '',
                    $record->confirmed_by_name ?? '',
                    $record->confirmed_at ?? ''
                );
            }

            return response($csv, 200, [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => 'attachment; filename="release-history.csv"',
            ]);
        }

        return response()->json(['error' => 'Unsupported export format'], 400);
    }
}
