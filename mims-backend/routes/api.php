<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\StatisticsController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Admin\UserController as AdminUserController;
use App\Modules\ActivityAllocation\Controllers\Admin\ActivityManagementController;
use App\Modules\ActivityAllocation\Controllers\Admin\OfficerDutyRosterController;
use App\Modules\ActivityAllocation\Controllers\Officer\AvailableActivitiesController;
use App\Modules\ActivityAllocation\Controllers\Officer\ActivitySessionController;
use App\Modules\ActivityAllocation\Controllers\Officer\ExternalActivityAllocationController;
use App\Modules\ActivityAllocation\Controllers\Officer\SessionAttendanceController;
use App\Modules\Admissions\Controllers\Api\ActivityController;
use App\Modules\Admissions\Controllers\Api\AdmissionController;
use App\Modules\Admissions\Controllers\Api\CellController;
use App\Modules\Admissions\Controllers\Api\DocumentController;
use App\Modules\Admissions\Controllers\Api\InmateController;
use App\Modules\Release\Controllers\Api\ReleaseApprovalController;
use App\Modules\Release\Controllers\Api\ReleaseConfirmationController;
use App\Modules\Release\Controllers\Api\SentenceAdjustmentController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Public authentication routes with strict throttling
Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle.auth:auth_login');

Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);

    // Only administrators can create new accounts with registration throttling
    Route::post('/register', [AuthController::class, 'register'])
        ->middleware('role:admin')
        ->middleware('throttle.auth:auth_register');

    // User profile routes - general throttling for authenticated users
    Route::get('/user', [AuthController::class, 'me'])->middleware('throttle:30,60,user');
    Route::get('/user/profile', [UserController::class, 'me'])->middleware('throttle:30,60,user');
    Route::get('/user/{user}', [UserController::class, 'show'])->middleware('throttle:30,60,user');

    // Profile update and password change with stricter throttling
    Route::put('/user/profile', [UserController::class, 'updateProfile'])->middleware('throttle:10,60,user');
    Route::post('/user/change-password', [UserController::class, 'changePassword'])
        ->middleware('throttle.auth:password_change');

    // Admin routes - stricter than regular users
    Route::middleware(['role:admin', 'throttle:100,60,user'])->prefix('admin')->group(function () {
        // Statistics must come before resource routes to avoid ID matching
        Route::get('/users/statistics', [AdminUserController::class, 'statistics'])->middleware('throttle:100,60,user');
        Route::post('/users/bulk-delete', [AdminUserController::class, 'bulkDelete'])->middleware('throttle:100,60,user');
        Route::post('/users/bulk-update-role', [AdminUserController::class, 'bulkUpdateRole'])->middleware('throttle:100,60,user');

        // Resource routes
        Route::apiResource('users', AdminUserController::class)->middleware('throttle:100,60,user');

        // Activity Allocation - Officer Duty Roster Management
        Route::prefix('duty-rosters')->group(function () {
            Route::get('/', [OfficerDutyRosterController::class, 'index']);
            Route::post('/', [OfficerDutyRosterController::class, 'store']);
            Route::post('/auto-assign', [OfficerDutyRosterController::class, 'autoAssign']);
            Route::get('/weekly-summary', [OfficerDutyRosterController::class, 'weeklySummary']);
            Route::get('/current', [OfficerDutyRosterController::class, 'currentOfficer']);
            // Backwards compatible route (shiftType is ignored).
            Route::get('/current/{shiftType}', [OfficerDutyRosterController::class, 'currentOfficer']);
            Route::get('/{id}', [OfficerDutyRosterController::class, 'show']);
            Route::put('/{id}', [OfficerDutyRosterController::class, 'update']);
            Route::patch('/{id}/deactivate', [OfficerDutyRosterController::class, 'deactivate']);
            Route::delete('/{id}', [OfficerDutyRosterController::class, 'destroy']);
        });

        // Activity Allocation - Activity Management
        Route::prefix('activities')->group(function () {
            Route::get('/', [ActivityManagementController::class, 'index']);
            Route::get('/categories', [ActivityManagementController::class, 'categories']);
            Route::get('/predefined', [ActivityManagementController::class, 'predefined']);
            Route::post('/internal', [ActivityManagementController::class, 'storeInternal']);
            Route::post('/external', [ActivityManagementController::class, 'storeExternal']);
            Route::get('/{id}', [ActivityManagementController::class, 'show']);
            Route::put('/{id}', [ActivityManagementController::class, 'update']);
            Route::put('/{id}/external', [ActivityManagementController::class, 'updateExternal']);
            Route::patch('/{id}/activate', [ActivityManagementController::class, 'activate']);
            Route::patch('/{id}/deactivate', [ActivityManagementController::class, 'deactivate']);
            Route::delete('/{id}', [ActivityManagementController::class, 'destroy']);
        });
    });

    // Inmate Admission Module
    Route::middleware(['role:reception_officer'])->group(function () {
        Route::get('/inmates', [InmateController::class, 'index'])->middleware('throttle:60,60,user');
        Route::post('/inmates/check-duplicate', [InmateController::class, 'checkDuplicate'])->middleware('throttle:30,60,user');
        Route::get('/inmates/search', [InmateController::class, 'search'])->middleware('throttle:60,60,user');
        Route::get('/inmates/{inmate}', [InmateController::class, 'show'])->middleware('throttle:60,60,user');
    });

    Route::middleware(['role:reception_officer'])->group(function () {
        Route::post('/inmates', [InmateController::class, 'store'])->middleware('throttle:30,60,user');

        Route::post('/admissions', [AdmissionController::class, 'store'])->middleware('throttle:30,60,user');

        Route::get('/cells/available', [CellController::class, 'available'])->middleware('throttle:60,60,user');
        Route::get('/activities', [ActivityController::class, 'index'])->middleware('throttle:60,60,user');
        Route::post('/documents', [DocumentController::class, 'store'])->middleware('throttle:30,60,user');
    });

    Route::middleware(['role:reception_officer'])->group(function () {
        Route::get('/admissions/{admission}', [AdmissionController::class, 'show'])->middleware('throttle:60,60,user');
    });

    Route::middleware(['role:station_officer,admin', 'throttle:60,60,user'])->group(function () {
        Route::get('/releases/eligible', [ReleaseApprovalController::class, 'index']);
        Route::post('/releases/approve', [ReleaseApprovalController::class, 'store']);
        Route::delete('/releases/{workflowId}', [ReleaseApprovalController::class, 'destroy']);

        Route::get('/adjustments/{admissionId}', [SentenceAdjustmentController::class, 'index']);
        Route::post('/adjustments', [SentenceAdjustmentController::class, 'store']);
    });

    Route::middleware(['role:gatekeeper,admin', 'throttle:60,60,user'])->group(function () {
        Route::get('/releases/pending', [ReleaseConfirmationController::class, 'index']);
        Route::put('/releases/{workflowId}/confirm', [ReleaseConfirmationController::class, 'update']);
    });

    Route::delete('/adjustments/{adjustmentId}', [SentenceAdjustmentController::class, 'destroy'])
        ->middleware(['role:admin', 'throttle:60,60,user']);

    // Activity Allocation - Officer endpoints
    Route::middleware(['role:officer_on_duty', 'throttle:100,60,user'])->prefix('officer')->group(function () {
        Route::get('/activities/available', [AvailableActivitiesController::class, 'index']);
        Route::get('/activities/{activity}/eligible-inmates', [ExternalActivityAllocationController::class, 'eligible']);
        Route::post('/activities/{activity}/allocations/manual', [ExternalActivityAllocationController::class, 'manual']);
        Route::post('/activities/{activity}/allocations/auto', [ExternalActivityAllocationController::class, 'auto']);

        Route::get('/activity-sessions', [ActivitySessionController::class, 'index']);
        Route::post('/activity-sessions', [ActivitySessionController::class, 'store']);
        Route::post('/activity-sessions/daily', [ActivitySessionController::class, 'daily']);
        Route::post('/activity-sessions/external-once', [ActivitySessionController::class, 'externalOnce']);
        Route::get('/activity-sessions/{id}', [ActivitySessionController::class, 'show']);
        Route::put('/activity-sessions/{id}', [ActivitySessionController::class, 'update']);
        Route::delete('/activity-sessions/{id}', [ActivitySessionController::class, 'destroy']);

        Route::post('/activity-sessions/{session}/attendance', [SessionAttendanceController::class, 'store']);
        Route::get('/activity-sessions/{session}/attendance/report', [SessionAttendanceController::class, 'report']);
        Route::get('/activity-sessions/{session}/attendance/summary', [SessionAttendanceController::class, 'summary']);
        Route::put('/attendance/{attendanceId}', [SessionAttendanceController::class, 'update']);
    });

    Route::get('/statistics/population', [StatisticsController::class, 'population'])->middleware('throttle:60,60,user');
    Route::get('/audit-logs', [AuditLogController::class, 'index'])->middleware(['role:admin', 'throttle:60,60,user']);
});
