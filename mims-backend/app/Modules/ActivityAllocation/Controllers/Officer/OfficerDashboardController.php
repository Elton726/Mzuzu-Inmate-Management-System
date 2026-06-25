<?php

namespace App\Modules\ActivityAllocation\Controllers\Officer;

use App\Http\Controllers\Controller;
use App\Modules\ActivityAllocation\Services\Officer\OfficerDashboardService;
use RuntimeException;

class OfficerDashboardController extends Controller
{
    public function __construct(protected OfficerDashboardService $dashboardService) {}

    public function metrics()
    {
        $officerId = auth()->id();

        if ($officerId === null) {
            throw new RuntimeException('Authenticated officer is required.');
        }

        return response()->json($this->dashboardService->getMetrics((int) $officerId));
    }
}
