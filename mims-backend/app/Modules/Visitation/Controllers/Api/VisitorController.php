<?php

namespace App\Modules\Visitation\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Visitation\Requests\StoreVisitorRequest;
use App\Modules\Visitation\Requests\UpdateVisitorRequest;
use App\Modules\Visitation\Services\VisitorService;
use Illuminate\Http\Request;
use RuntimeException;

class VisitorController extends Controller
{
    public function __construct(private VisitorService $service)
    {
        $this->middleware('auth:sanctum');
    }

    public function index(Request $request)
    {
        $filters = [
            'search' => $request->query('search'),
            'national_id' => $request->query('national_id'),
            'is_approved' => $request->has('is_approved') ? $request->boolean('is_approved') : null,
        ];

        return response()->json($this->service->list(array_filter($filters, fn ($value) => $value !== null), $request->integer('per_page', 15)));
    }

    public function store(StoreVisitorRequest $request)
    {
        return response()->json($this->service->create($request->validated()), 201);
    }

    public function approve(int $id)
    {
        try {
            return response()->json($this->service->approve($id));
        } catch (RuntimeException $exception) {
            return response()->json(['error' => $exception->getMessage()], 422);
        }
    }

    public function show(int $id)
    {
        return response()->json($this->service->show($id));
    }

    public function update(UpdateVisitorRequest $request, int $id)
    {
        return response()->json($this->service->update($id, $request->validated()));
    }

    public function destroy(int $id)
    {
        $this->service->delete($id);

        return response()->noContent();
    }
}
