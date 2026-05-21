<?php

namespace App\Modules\Visitation\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Visitation\Requests\StoreVisitationRuleRequest;
use App\Modules\Visitation\Requests\UpdateVisitationRuleRequest;
use App\Modules\Visitation\Services\VisitationRuleService;

class VisitationRuleController extends Controller
{
    public function __construct(private VisitationRuleService $service)
    {
        $this->middleware('auth:sanctum');
    }

    public function store(StoreVisitationRuleRequest $request)
    {
        return response()->json($this->service->create($request->validated()), 201);
    }

    public function indexForInmate(int $inmateId)
    {
        return response()->json($this->service->listForInmate($inmateId));
    }

    public function update(UpdateVisitationRuleRequest $request, int $id)
    {
        return response()->json($this->service->update($id, $request->validated()));
    }

    public function destroy(int $id)
    {
        $this->service->delete($id);

        return response()->noContent();
    }
}
