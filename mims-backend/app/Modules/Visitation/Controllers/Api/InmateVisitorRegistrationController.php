<?php

namespace App\Modules\Visitation\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Visitation\Requests\StoreInmateVisitorRegistrationRequest;
use App\Modules\Visitation\Services\InmateVisitorRegistrationService;
use Illuminate\Http\Request;
use RuntimeException;

class InmateVisitorRegistrationController extends Controller
{
    public function __construct(private InmateVisitorRegistrationService $service)
    {
        $this->middleware('auth:sanctum');
    }

    public function store(StoreInmateVisitorRegistrationRequest $request)
    {
        try {
            return response()->json($this->service->register($request->validated()), 201);
        } catch (RuntimeException $exception) {
            return response()->json(['error' => $exception->getMessage()], 422);
        }
    }

    public function index(int $inmateId, Request $request)
    {
        return response()->json($this->service->listForInmate($inmateId, $request->integer('per_page', 15)));
    }

    public function destroy(int $id)
    {
        $this->service->deactivate($id);

        return response()->noContent();
    }
}
