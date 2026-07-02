<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\StatisticsController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\UserController as AdminUserController;
use App\Modules\ActivityAllocation\Controllers\Admin\ActivityManagementController;
use App\Modules\ActivityAllocation\Controllers\Admin\OfficerDutyRosterController;
use App\Modules\Admissions\Controllers\Api\ActivityController;
use App\Modules\Admissions\Controllers\Api\AdmissionController;
use App\Modules\Admissions\Controllers\Api\CellController;
use App\Modules\Admissions\Controllers\Api\DocumentController;
use App\Modules\Admissions\Controllers\Api\InmateController;
use App\Modules\Admissions\Controllers\Api\ReportController as AdmissionsReportController;
use App\Modules\ActivityAllocation\Controllers\Officer\ActivitySessionController;
use App\Modules\ActivityAllocation\Controllers\Officer\AvailableActivitiesController;
use App\Modules\ActivityAllocation\Controllers\Officer\OfficerDashboardController;
use App\Modules\ActivityAllocation\Controllers\Officer\ExternalActivityAllocationController;
use App\Modules\ActivityAllocation\Controllers\Officer\SessionAttendanceController;
use App\Modules\ActivityAllocation\Controllers\Officer\InternalActivityAutoAssignController;
use App\Modules\ActivityAllocation\Controllers\Officer\ActivityReportController;
use App\Modules\Release\Controllers\Api\ReleaseApprovalController;
use App\Modules\Release\Controllers\Api\ReleaseConfirmationController;
use App\Modules\Release\Controllers\Api\ReleaseDateLookupController;
use App\Modules\Release\Controllers\Api\ReleaseClearanceChecklistController;
use App\Modules\Release\Controllers\Api\SentenceAdjustmentController;
use App\Modules\Release\Controllers\Api\SentenceAdjustmentTypeController;
use App\Modules\Visitation\Controllers\Api\CharityBookingController;
use App\Modules\Visitation\Controllers\Api\VisitFlagReviewController;
use App\Modules\Visitation\Controllers\Api\VisitItemController;
use App\Modules\Visitation\Controllers\Api\VisitReportController;
use App\Modules\Visitation\Controllers\Api\VisitSessionController;
use App\Modules\Visitation\Controllers\Api\VisitationNotificationController;
use App\Modules\Visitation\Controllers\Api\VisitationRuleController;
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
        Route::get('/dashboard/overview', [AdminDashboardController::class, 'overview'])->middleware('throttle:60,60,user');

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

        // Release Module - Admin sentence adjustment types
        Route::prefix('sentence-adjustment-types')->group(function () {
            Route::get('/', [SentenceAdjustmentTypeController::class, 'index']);
            Route::post('/', [SentenceAdjustmentTypeController::class, 'store']);
            Route::get('/{sentenceAdjustmentType}', [SentenceAdjustmentTypeController::class, 'show']);
            Route::put('/{sentenceAdjustmentType}', [SentenceAdjustmentTypeController::class, 'update']);
            Route::delete('/{sentenceAdjustmentType}', [SentenceAdjustmentTypeController::class, 'destroy']);
        });
    });

    // Inmate Admission Module
    // Search must be defined before the implicit inmate binding route so /inmates/search does not match /inmates/{inmate}
    Route::get('/inmates/search', [InmateController::class, 'search'])
        ->middleware(['role:reception_officer,station_officer,visitation_officer,gatekeeper,officer_on_duty,admin', 'throttle:60,60,user']);

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

        // Admissions reporting
        Route::get('/reports/admissions', [AdmissionsReportController::class, 'index'])->middleware('throttle:30,60,user');
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
    Route::prefix('visitation')->group(function () {
        Route::middleware(['role:gatekeeper'])->group(function () {
            Route::get('/visitors/search', [VisitorController::class, 'search']);
            Route::post('/slot-check', [VisitSessionController::class, 'validateSlot']);
            Route::post('/sessions', [VisitSessionController::class, 'store']);
            Route::put('/sessions/{session}/check-in', [VisitSessionController::class, 'checkIn']);
            Route::put('/sessions/{session}/check-out', [VisitSessionController::class, 'checkOut']);
            Route::post('/sessions/{session}/deny', [VisitSessionController::class, 'deny']);
            Route::put('/sessions/{session}/cancel', [VisitSessionController::class, 'cancel']);
            Route::post('/sessions/{session}/items', [VisitItemController::class, 'store']);
            Route::put('/items/{item}', [VisitItemController::class, 'update']);
            Route::post('/charity-bookings', [CharityBookingController::class, 'store']);
        });

        Route::middleware(['role:station_officer'])->group(function () {
            Route::put('/charity-bookings/{booking}/approve', [CharityBookingController::class, 'approve']);
            Route::put('/charity-bookings/{booking}/reject', [CharityBookingController::class, 'reject']);
            Route::put('/visitors/{visitor}/watchlist', [VisitorController::class, 'updateWatchlist']);
            Route::get('/flag-reviews', [VisitFlagReviewController::class, 'index']);
            Route::put('/flag-reviews/{review}/resolve', [VisitFlagReviewController::class, 'resolve']);
        });

        Route::middleware(['role:admin,station_officer'])->group(function () {
            Route::put('/rules', [VisitationRuleController::class, 'update']);
        });

        Route::middleware(['role:gatekeeper,station_officer,admin'])->group(function () {
            Route::get('/rules', [VisitationRuleController::class, 'index']);
            Route::get('/today-schedule', [VisitReportController::class, 'todaySchedule']);
            Route::get('/pending-charity', [VisitReportController::class, 'pendingCharity']);
            Route::get('/statistics', [VisitReportController::class, 'statistics']);
            Route::get('/history', [VisitReportController::class, 'history']);
            Route::get('/history/export', [VisitReportController::class, 'exportHistory'])->middleware('throttle:10,60,user');
            Route::get('/alerts', [VisitReportController::class, 'alerts']);
            Route::get('/notifications', [VisitationNotificationController::class, 'index']);
            Route::put('/notifications/{notification}/read', [VisitationNotificationController::class, 'markRead']);
            Route::get('/charity-bookings/{booking}/pdf', [CharityBookingController::class, 'downloadPdf'])
                ->middleware('signed')
                ->name('visitation.charity-pdf');
        });
    });

    // Release Module - Station Officer & Gatekeeper
    Route::middleware(['role:station_officer,gatekeeper'])->group(function () {
        // Release approval (station officer)
        Route::middleware('role:station_officer')->group(function () {
            Route::get('/releases/eligible', [ReleaseApprovalController::class, 'index'])->middleware('throttle:60,60,user');
            Route::post('/releases/approve', [ReleaseApprovalController::class, 'store'])->middleware('throttle:30,60,user');
            Route::delete('/releases/{workflowId}', [ReleaseApprovalController::class, 'destroy'])->middleware('throttle:10,60,user');
        });

        // Release clearance checklist (station officer & gatekeeper)
        Route::middleware('role:station_officer,gatekeeper')->group(function () {
            Route::post('/releases/clearance-checklist', [ReleaseClearanceChecklistController::class, 'store'])->middleware('throttle:30,60,user');
            Route::get('/releases/clearance-checklist/workflow/{workflowId}', [ReleaseClearanceChecklistController::class, 'byWorkflow'])->middleware('throttle:60,60,user');
            Route::get('/releases/clearance-checklist/admission/{admissionId}', [ReleaseClearanceChecklistController::class, 'byAdmission'])->middleware('throttle:60,60,user');
            Route::get('/releases/clearance-checklist/available-items', [ReleaseClearanceChecklistController::class, 'availableItems'])->middleware('throttle:60,60,user');
            Route::get('/releases/clearance-checklist/{checklistId}', [ReleaseClearanceChecklistController::class, 'show'])->middleware('throttle:60,60,user');
            Route::post('/releases/clearance-checklist/clear-item', [ReleaseClearanceChecklistController::class, 'clearItem'])->middleware('throttle:30,60,user');
            Route::post('/releases/clearance-checklist/unclear-item', [ReleaseClearanceChecklistController::class, 'unclearItem'])->middleware('throttle:30,60,user');
            Route::get('/releases/clearance-checklist/{checklistId}/status', [ReleaseClearanceChecklistController::class, 'status'])->middleware('throttle:60,60,user');
        });

        // Completion of clearance checklist (station officer only)
        Route::middleware('role:station_officer')->group(function () {
            Route::put('/releases/clearance-checklist/{checklistId}/complete', [ReleaseClearanceChecklistController::class, 'complete'])->middleware('throttle:10,60,user');
        });

        // Release confirmation (gatekeeper)
        Route::middleware('role:gatekeeper')->group(function () {
            Route::get('/releases/pending-confirmations', [ReleaseConfirmationController::class, 'index'])->middleware('throttle:60,60,user');
            Route::put('/releases/{workflowId}/confirm', [ReleaseConfirmationController::class, 'update'])->middleware('throttle:10,60,user');
        });

        // Confirmed releases (station officer)
        Route::middleware('role:station_officer')->group(function () {
            Route::get('/releases/date-lookup', [ReleaseDateLookupController::class, 'index'])->middleware('throttle:60,60,user');
            Route::get('/releases/confirmed', [ReleaseApprovalController::class, 'confirmed'])->middleware('throttle:60,60,user');
        });

        // Sentence adjustments (station officer)
        Route::middleware('role:station_officer')->group(function () {
            Route::get('/admissions/{admissionId}/adjustments', [SentenceAdjustmentController::class, 'index'])->middleware('throttle:60,60,user');
            Route::get('/adjustments/{admissionId}', [SentenceAdjustmentController::class, 'index'])->middleware('throttle:60,60,user');
            Route::post('/admissions/{admissionId}/adjustments', [SentenceAdjustmentController::class, 'store'])->middleware('throttle:30,60,user');
            Route::post('/adjustments', [SentenceAdjustmentController::class, 'storeLegacy'])->middleware('throttle:30,60,user');
            Route::delete('/adjustments/{adjustmentId}', [SentenceAdjustmentController::class, 'destroy'])->middleware('throttle:10,60,user');
            Route::get('/sentence-adjustment-types/available', [SentenceAdjustmentTypeController::class, 'availableTypes'])->middleware('throttle:60,60,user');
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
        Route::get('/activities/{activityId}/assigned-inmates', [AvailableActivitiesController::class, 'assignedInmates'])->middleware('throttle:60,60,user');
        Route::get('/activity-reports', [ActivityReportController::class, 'index'])->middleware('throttle:30,60,user');
        Route::get('/dashboard/metrics', [OfficerDashboardController::class, 'metrics'])->middleware('throttle:60,60,user');
        Route::get('/activities/{activityId}/eligible-inmates', [ExternalActivityAllocationController::class, 'eligible'])->middleware('throttle:60,60,user');
        Route::post('/activities/{activityId}/allocations/manual', [ExternalActivityAllocationController::class, 'manual'])->middleware('throttle:30,60,user');
        Route::post('/activities/{activityId}/allocations/auto', [ExternalActivityAllocationController::class, 'auto'])->middleware('throttle:30,60,user');

        // Internal Activity Rotation Auto-Assignment
        Route::get('/internal-activities/{activityId}/rotation-status', [InternalActivityAutoAssignController::class, 'status'])->middleware('throttle:60,60,user');
        Route::post('/internal-activities/{activityId}/auto-assign', [InternalActivityAutoAssignController::class, 'autoAssign'])->middleware('throttle:30,60,user');
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
