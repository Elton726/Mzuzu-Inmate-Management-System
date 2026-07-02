<?php

namespace App\Modules\Release\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Release\Requests\ConfirmReleaseRequest;
use App\Modules\Release\Services\ReleaseService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use RuntimeException;

class ReleaseConfirmationController extends Controller
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
        $page = $validated['page'] ?? 1;
        $query = $validated['q'] ?? null;

        $releases = $this->releaseService->getPendingReleases();

        if ($query) {
            $terms = collect(preg_split('/\s+/', $query) ?: [])
                ->filter()
                ->values();

            $releases = $releases->filter(function ($item) use ($query, $terms) {
                $inmate = $item->admission->inmate;
                $fullName = strtolower($inmate->first_name . ' ' . ($inmate->other_names ? $inmate->other_names . ' ' : '') . $inmate->last_name);
                $prisonNo = strtolower($inmate->prison_number);

                if (str_contains($fullName, strtolower($query)) || str_contains($prisonNo, strtolower($query))) {
                    return true;
                }

                if ($terms->count() > 1) {
                    return $terms->every(function ($term) use ($fullName, $prisonNo) {
                        return str_contains($fullName, strtolower($term)) || str_contains($prisonNo, strtolower($term));
                    });
                }

                return false;
            });
        }

        $total = $releases->count();
        $releases = $releases->slice(($page - 1) * $perPage, $perPage)->values();

        return response()->json([
            'data' => $releases,
            'total' => $total,
            'per_page' => $perPage,
            'current_page' => $page,
            'last_page' => ceil($total / $perPage),
        ]);
    }

    public function update(int $workflowId, ConfirmReleaseRequest $request)
    {
        try {
            $workflow = $this->releaseService->confirmRelease(
                $workflowId,
                (int) $request->user()->id,
                $request->string('notes')->toString() ?: null,
                $request->ip(),
            );

            return response()->json($workflow);
        } catch (ModelNotFoundException) {
            return response()->json(['error' => 'Release workflow not found.'], 404);
        } catch (RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }
}
