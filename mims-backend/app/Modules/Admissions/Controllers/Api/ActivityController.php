<?php

namespace App\Modules\Admissions\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Admissions\Models\Activity;

class ActivityController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    public function index()
    {
        return response()->json(Activity::query()->where('is_active', true)->orderBy('name')->get());
    }
}
