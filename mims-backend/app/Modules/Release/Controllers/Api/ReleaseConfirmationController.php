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
            $releases = $releases->filter(function ($item) use ($query) {
                return str_contains(strtolower($item->admission->inmate->first_name . ' ' . $item->admission->inmate->last_name), strtolower($query))
                    || str_contains(strtolower($item->admission->inmate->prison_number), strtolower($query));
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
