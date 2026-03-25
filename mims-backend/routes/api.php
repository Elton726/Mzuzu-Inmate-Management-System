<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ActivityController;
use App\Http\Controllers\Api\AdmissionController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\CellController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\InmateController;
use App\Http\Controllers\Api\StatisticsController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Admin\UserController as AdminUserController;
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
    });

    // Inmate Admission Module
    Route::middleware(['role:reception_officer,station_officer'])->group(function () {
        Route::post('/inmates/check-duplicate', [InmateController::class, 'checkDuplicate'])->middleware('throttle:30,60,user');
        Route::get('/inmates/search', [InmateController::class, 'search'])->middleware('throttle:60,60,user');
        Route::get('/inmates/{inmate}', [InmateController::class, 'show'])->middleware('throttle:60,60,user');
    });

    Route::middleware(['role:reception_officer'])->group(function () {
        Route::post('/inmates', [InmateController::class, 'store'])->middleware('throttle:30,60,user');
        Route::put('/inmates/{inmate}', [InmateController::class, 'update'])->middleware('throttle:30,60,user');

        Route::post('/admissions', [AdmissionController::class, 'store'])->middleware('throttle:30,60,user');

        Route::get('/cells/available', [CellController::class, 'available'])->middleware('throttle:60,60,user');
        Route::get('/activities', [ActivityController::class, 'index'])->middleware('throttle:60,60,user');
        Route::post('/documents', [DocumentController::class, 'store'])->middleware('throttle:30,60,user');
    });

    Route::middleware(['role:reception_officer,station_officer'])->group(function () {
        Route::get('/admissions/{admission}', [AdmissionController::class, 'show'])->middleware('throttle:60,60,user');
    });

    Route::get('/statistics/population', [StatisticsController::class, 'population'])->middleware('throttle:60,60,user');
    Route::get('/audit-logs', [AuditLogController::class, 'index'])->middleware(['role:admin', 'throttle:60,60,user']);
});
