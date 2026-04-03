<?php

namespace App\Modules\ActivityAllocation\Controllers\Officer;

use App\Http\Controllers\Controller;
use App\Modules\ActivityAllocation\Services\Officer\ActivitySessionService;
use App\Modules\ActivityAllocation\Requests\Officer\StoreDailyActivitySessionRequest;
use App\Modules\ActivityAllocation\Requests\Officer\StoreExternalOneTimeSessionRequest;
use App\Modules\ActivityAllocation\Requests\Officer\StoreActivitySessionRequest;
use App\Modules\ActivityAllocation\Requests\Officer\UpdateActivitySessionRequest;
use Illuminate\Http\Request;

class ActivitySessionController extends Controller
{
    public function __construct(protected ActivitySessionService $sessionService) {}

    /**
     * List sessions (with optional filters).
     */
    public function index(Request $request)
    {
        $sessions = $this->sessionService->listSessions($request->all());
        return response()->json($sessions);
    }

    /**
     * Create a new session.
     */
    public function store(StoreActivitySessionRequest $request)
    {
        try {
            $session = $this->sessionService->createSession($request->validated());
            return response()->json($session, 201);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /**
     * Create (or fetch) the daily session for an internal activity.
     */
    public function daily(StoreDailyActivitySessionRequest $request)
    {
        try {
            $result = $this->sessionService->getOrCreateDailySession($request->validated());
            return response()->json($result['session'], $result['created'] ? 201 : 200);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /**
     * Create (or fetch) the one-time session for an external activity.
     */
    public function externalOnce(StoreExternalOneTimeSessionRequest $request)
    {
        try {
            $result = $this->sessionService->getOrCreateExternalOneTimeSession($request->validated());
            return response()->json($result['session'], $result['created'] ? 201 : 200);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /**
     * Get a single session.
     */
    public function show($id)
    {
        $session = $this->sessionService->getSession($id);
        return response()->json($session);
    }

    /**
     * Update a session.
     */
    public function update(UpdateActivitySessionRequest $request, $id)
    {
        try {
            $session = $this->sessionService->updateSession($id, $request->validated());
            return response()->json($session);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /**
     * Delete a session (only if no attendance recorded).
     */
    public function destroy($id)
    {
        try {
            $this->sessionService->deleteSession($id);
            return response()->json(null, 204);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }
}
