<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\StatisticsController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Admin\UserController as AdminUserController;
use App\Modules\ActivityAllocation\Controllers\Admin\ActivityManagementController;
use App\Modules\ActivityAllocation\Controllers\Admin\OfficerDutyRosterController;
use App\Modules\Admissions\Controllers\Api\ActivityController;
use App\Modules\Admissions\Controllers\Api\AdmissionController;
use App\Modules\Admissions\Controllers\Api\CellController;
use App\Modules\Admissions\Controllers\Api\DocumentController;
use App\Modules\Admissions\Controllers\Api\InmateController;
use App\Modules\ActivityAllocation\Controllers\Officer\ActivitySessionController;
use App\Modules\ActivityAllocation\Controllers\Officer\AvailableActivitiesController;
use App\Modules\ActivityAllocation\Controllers\Officer\ExternalActivityAllocationController;
use App\Modules\ActivityAllocation\Controllers\Officer\SessionAttendanceController;
use App\Modules\Release\Controllers\Api\ReleaseApprovalController;
use App\Modules\Release\Controllers\Api\ReleaseConfirmationController;
use App\Modules\Release\Controllers\Api\SentenceAdjustmentController;
use App\Modules\Visitation\Controllers\Api\InmateVisitorRegistrationController;
use App\Modules\Visitation\Controllers\Api\ReportController;
use App\Modules\Visitation\Controllers\Api\VisitationItemController;
use App\Modules\Visitation\Controllers\Api\VisitationRuleController;
use App\Modules\Visitation\Controllers\Api\VisitationSessionController;
use App\Modules\Visitation\Controllers\Api\VisitorController;
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

        Route::get('/cells', [CellController::class, 'index']);
        Route::post('/cells', [CellController::class, 'store']);
        Route::put('/cells/{cell}', [CellController::class, 'update']);
        Route::delete('/cells/{cell}', [CellController::class, 'destroy']);

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
    // Search must be defined before the implicit inmate binding route so /inmates/search does not match /inmates/{inmate}
    Route::get('/inmates/search', [InmateController::class, 'search'])
        ->middleware(['role:reception_officer,station_officer,visitation_officer,gatekeeper,admin', 'throttle:60,60,user']);

    Route::middleware(['role:reception_officer,station_officer'])->group(function () {
        Route::get('/inmates', [InmateController::class, 'index'])->middleware('throttle:60,60,user');
        Route::post('/inmates/check-duplicate', [InmateController::class, 'checkDuplicate'])->middleware('throttle:30,60,user');
        Route::get('/inmates/{inmate}', [InmateController::class, 'show'])->middleware('throttle:60,60,user');
    });

    Route::middleware(['role:reception_officer'])->group(function () {
        Route::post('/inmates', [InmateController::class, 'store'])->middleware('throttle:30,60,user');

        Route::post('/admissions', [AdmissionController::class, 'store'])->middleware('throttle:30,60,user');

        Route::get('/activities', [ActivityController::class, 'index'])->middleware('throttle:60,60,user');
        Route::post('/documents', [DocumentController::class, 'store'])->middleware('throttle:30,60,user');
    });

    Route::middleware(['role:reception_officer,admin'])->group(function () {
        Route::get('/cells', [CellController::class, 'index'])->middleware('throttle:60,60,user');
        Route::get('/cells/available', [CellController::class, 'available'])->middleware('throttle:60,60,user');
    });

    Route::middleware(['role:reception_officer,station_officer'])->group(function () {
        Route::get('/admissions/{admission}', [AdmissionController::class, 'show'])->middleware('throttle:60,60,user');
    });

    Route::middleware(['role:station_officer'])->group(function () {
        Route::put('/admissions/{admission}/sentence-length', [AdmissionController::class, 'updateSentenceLength'])->middleware('throttle:30,60,user');
    });

    Route::get('/statistics/population', [StatisticsController::class, 'population'])->middleware('throttle:60,60,user');
    Route::get('/audit-logs', [AuditLogController::class, 'index'])->middleware(['role:admin', 'throttle:60,60,user']);

    // Visitation Module
    Route::middleware(['role:visitation_officer,admin,gatekeeper'])->group(function () {
        Route::post('/visitors', [VisitorController::class, 'store']);
        Route::put('/visitors/{id}/approve', [VisitorController::class, 'approve']);
        Route::get('/visitors', [VisitorController::class, 'index']);
        Route::get('/visitors/{id}', [VisitorController::class, 'show']);
    });

    Route::middleware(['role:admin,gatekeeper'])->group(function () {
        Route::put('/visitors/{id}', [VisitorController::class, 'update']);
        Route::delete('/visitors/{id}', [VisitorController::class, 'destroy']);
    });

    Route::middleware(['role:visitation_officer,gatekeeper'])->group(function () {
        Route::post('/inmate-visitor-registrations', [InmateVisitorRegistrationController::class, 'store']);
        Route::delete('/inmate-visitor-registrations/{id}', [InmateVisitorRegistrationController::class, 'destroy']);
    });

    Route::middleware(['role:visitation_officer,station_officer,gatekeeper'])->group(function () {
        Route::get('/inmates/{inmateId}/visitors', [InmateVisitorRegistrationController::class, 'index']);
        Route::get('/visitation-sessions', [VisitationSessionController::class, 'index']);
        Route::get('/visitation-sessions/{id}', [VisitationSessionController::class, 'show']);
        Route::post('/visitation-sessions', [VisitationSessionController::class, 'store']);
    });

    Route::middleware(['role:visitation_officer,officer_on_duty,gatekeeper'])->group(function () {
        Route::put('/visitation-sessions/{id}/check-in', [VisitationSessionController::class, 'checkIn']);
        Route::put('/visitation-sessions/{id}/check-out', [VisitationSessionController::class, 'checkOut']);
    });

    Route::middleware(['role:visitation_officer,station_officer,gatekeeper'])->group(function () {
        Route::put('/visitation-sessions/{id}/cancel', [VisitationSessionController::class, 'cancel']);
    });

    Route::middleware(['role:visitation_officer,gatekeeper'])->group(function () {
        Route::post('/visitation-sessions/{id}/deny', [VisitationSessionController::class, 'deny']);
        Route::post('/visitation-items', [VisitationItemController::class, 'store']);
    });

    Route::middleware(['role:officer_on_duty,visitation_officer,gatekeeper'])->group(function () {
        Route::put('/visitation-items/{id}/inspect', [VisitationItemController::class, 'inspect']);
    });

    Route::middleware(['role:visitation_officer,admin,gatekeeper'])->group(function () {
        Route::get('/visitation-sessions/{id}/pdf', [VisitationSessionController::class, 'downloadPdf']);
    });

    Route::middleware(['role:station_officer,admin,gatekeeper'])->group(function () {
        Route::post('/visitation-rules', [VisitationRuleController::class, 'store']);
        Route::put('/visitation-rules/{id}', [VisitationRuleController::class, 'update']);
        Route::delete('/visitation-rules/{id}', [VisitationRuleController::class, 'destroy']);
        Route::get('/inmates/{inmateId}/visitation-rules', [VisitationRuleController::class, 'indexForInmate']);
        Route::get('/reports/visitation-statistics', [ReportController::class, 'visitationStatistics']);
    });

    Route::middleware(['role:visitation_officer,gatekeeper'])->group(function () {
        Route::get('/reports/today-schedule', [ReportController::class, 'todaySchedule']);
    });

    Route::middleware(['role:visitation_officer,admin,gatekeeper'])->group(function () {
        Route::get('/reports/pending-charity', [ReportController::class, 'pendingCharity']);
    });

    // Release Module - Station Officer & Gatekeeper
    Route::middleware(['role:station_officer,gatekeeper'])->group(function () {
        // Release approval (station officer)
        Route::middleware('role:station_officer')->group(function () {
            Route::get('/releases/eligible', [ReleaseApprovalController::class, 'index'])->middleware('throttle:60,60,user');
            Route::post('/releases/approve', [ReleaseApprovalController::class, 'store'])->middleware('throttle:30,60,user');
            Route::delete('/releases/{workflowId}', [ReleaseApprovalController::class, 'destroy'])->middleware('throttle:10,60,user');
        });

        // Release confirmation (gatekeeper)
        Route::middleware('role:gatekeeper')->group(function () {
            Route::get('/releases/pending-confirmations', [ReleaseConfirmationController::class, 'index'])->middleware('throttle:60,60,user');
            Route::put('/releases/{workflowId}/confirm', [ReleaseConfirmationController::class, 'update'])->middleware('throttle:10,60,user');
        });

        // Confirmed releases (station officer)
        Route::middleware('role:station_officer')->group(function () {
            Route::get('/releases/confirmed', [ReleaseApprovalController::class, 'confirmed'])->middleware('throttle:60,60,user');
        });

        // Sentence adjustments (station officer)
        Route::middleware('role:station_officer')->group(function () {
            Route::get('/admissions/{admissionId}/adjustments', [SentenceAdjustmentController::class, 'index'])->middleware('throttle:60,60,user');
            Route::get('/adjustments/{admissionId}', [SentenceAdjustmentController::class, 'index'])->middleware('throttle:60,60,user');
            Route::post('/admissions/{admissionId}/adjustments', [SentenceAdjustmentController::class, 'store'])->middleware('throttle:30,60,user');
            Route::post('/adjustments', [SentenceAdjustmentController::class, 'storeLegacy'])->middleware('throttle:30,60,user');
            Route::delete('/adjustments/{adjustmentId}', [SentenceAdjustmentController::class, 'destroy'])->middleware('throttle:10,60,user');
        });

        // Release history (station officer & gatekeeper)
        Route::get('/releases/history', [ReleaseApprovalController::class, 'history'])->middleware('throttle:60,60,user');
        Route::get('/releases/history/export', [ReleaseApprovalController::class, 'exportHistory'])->middleware('throttle:10,60,user');
    });
});

Route::middleware(['auth:sanctum'])->group(function () {
    // Officer session routes - existing front-end paths and backwards compatibility
    Route::prefix('officer')->group(function () {
        Route::prefix('activity-sessions')->group(function () {
            Route::get('/', [ActivitySessionController::class, 'index']);
            Route::post('/', [ActivitySessionController::class, 'store']);
            Route::post('/daily', [ActivitySessionController::class, 'daily']);
            Route::post('/external-once', [ActivitySessionController::class, 'externalOnce']);
            Route::get('/{id}', [ActivitySessionController::class, 'show']);
            Route::put('/{id}', [ActivitySessionController::class, 'update']);
            Route::delete('/{id}', [ActivitySessionController::class, 'destroy']);
            Route::post('/{id}/attendance', [SessionAttendanceController::class, 'store']);
            Route::get('/{id}/attendance/report', [SessionAttendanceController::class, 'report']);
            Route::get('/{id}/attendance/summary', [SessionAttendanceController::class, 'summary']);
        });

        Route::get('/activities/available', [AvailableActivitiesController::class, 'index'])->middleware('throttle:60,60,user');
        Route::get('/activities/{activityId}/eligible-inmates', [ExternalActivityAllocationController::class, 'eligible'])->middleware('throttle:60,60,user');
        Route::post('/activities/{activityId}/allocations/manual', [ExternalActivityAllocationController::class, 'manual'])->middleware('throttle:30,60,user');
        Route::post('/activities/{activityId}/allocations/auto', [ExternalActivityAllocationController::class, 'auto'])->middleware('throttle:30,60,user');
    });

    // Sessions – accessible by officer_on_duty and admin
    Route::prefix('sessions')->group(function () {
        Route::get('/', [ActivitySessionController::class, 'index']);
        Route::post('/', [ActivitySessionController::class, 'store']);
        Route::get('{id}', [ActivitySessionController::class, 'show']);
        Route::put('{id}', [ActivitySessionController::class, 'update']);
        Route::delete('{id}', [ActivitySessionController::class, 'destroy']);
    });

    // Attendance
    Route::prefix('attendance')->group(function () {
        Route::post('/', [SessionAttendanceController::class, 'store']);
        Route::get('sessions/{sessionId}/report', [SessionAttendanceController::class, 'report']);
        Route::get('sessions/{sessionId}/summary', [SessionAttendanceController::class, 'summary']);
        Route::put('{attendanceId}', [SessionAttendanceController::class, 'update']);
    });
});
