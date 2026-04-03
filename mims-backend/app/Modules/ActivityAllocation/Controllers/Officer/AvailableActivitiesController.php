<?php

namespace App\Modules\ActivityAllocation\Controllers\Officer;

use App\Http\Controllers\Controller;
use App\Modules\ActivityAllocation\Services\Officer\AvailableActivityService;
use Illuminate\Http\Request;

class AvailableActivitiesController extends Controller
{
    public function __construct(protected AvailableActivityService $service) {}

    public function index(Request $request)
    {
        return response()->json($this->service->listAvailable($request->all()));
    }
}

