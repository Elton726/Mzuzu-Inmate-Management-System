<?php

namespace App\Modules\Visitation\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Visitation\Requests\InspectVisitationItemRequest;
use App\Modules\Visitation\Requests\StoreVisitationItemRequest;
use App\Modules\Visitation\Services\VisitationItemService;
use RuntimeException;

class VisitationItemController extends Controller
{
    public function __construct(private VisitationItemService $service)
    {
        $this->middleware('auth:sanctum');
    }

    public function store(StoreVisitationItemRequest $request)
    {
        return response()->json($this->service->add($request->validated()), 201);
    }

    public function inspect(InspectVisitationItemRequest $request, int $id)
    {
        try {
            return response()->json($this->service->inspect($id, $request->validated()));
        } catch (RuntimeException $exception) {
            return response()->json(['error' => $exception->getMessage()], 422);
        }
    }
}
