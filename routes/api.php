<?php

use App\Http\Controllers\Api\V1\AuditLogController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BookingController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\IncidentReportController;
use App\Http\Controllers\Api\V1\InventoryItemController;
use App\Http\Controllers\Api\V1\JobOrderController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\ServiceRequestController;
use App\Http\Controllers\Api\V1\UserController;
use Illuminate\Support\Facades\Route;

Route::name('api.v1.')->prefix('v1')->group(function () {
    Route::prefix('auth')->controller(AuthController::class)->name('auth.')->group(function () {
        Route::post('login', 'login');
        Route::post('register', 'register')->middleware('throttle:6,1');
        Route::post('refresh', 'refresh');
        Route::post('logout', 'logout');
        Route::get('me', 'me');
    });

    Route::middleware(['auth:api', 'approved'])->group(function () {
        Route::get('dashboard', DashboardController::class);

        Route::get('requests', [ServiceRequestController::class, 'index']);
        Route::post('requests', [ServiceRequestController::class, 'store']);
        Route::get('requests/{id}', [ServiceRequestController::class, 'show']);
        Route::put('requests/{id}', [ServiceRequestController::class, 'update']);

        Route::get('job-orders', [JobOrderController::class, 'index']);
        Route::get('job-orders/{id}', [JobOrderController::class, 'show']);
        Route::put('job-orders/{id}', [JobOrderController::class, 'update']);
        Route::post('job-orders/{id}/responses', [JobOrderController::class, 'addResponse']);
        Route::post('job-orders/{id}/rate', [JobOrderController::class, 'rate']);
        Route::post('job-orders/{id}/verify', [JobOrderController::class, 'verify']);

        Route::get('bookings', [BookingController::class, 'index']);
        Route::post('bookings', [BookingController::class, 'store']);
        Route::get('bookings/{id}', [BookingController::class, 'show']);
        Route::put('bookings/{id}', [BookingController::class, 'update']);
        Route::get('facilities', [BookingController::class, 'facilities']);

        Route::get('incidents', [IncidentReportController::class, 'index']);
        Route::post('incidents', [IncidentReportController::class, 'store']);
        Route::get('incidents/{id}', [IncidentReportController::class, 'show']);
        Route::put('incidents/{id}', [IncidentReportController::class, 'update']);

        Route::get('inventory', [InventoryItemController::class, 'index']);
        Route::post('inventory', [InventoryItemController::class, 'store']);
        Route::get('inventory/{id}', [InventoryItemController::class, 'show']);
        Route::put('inventory/{id}', [InventoryItemController::class, 'update']);
        Route::delete('inventory/{id}', [InventoryItemController::class, 'destroy']);
        Route::get('inventory/{id}/qr', [InventoryItemController::class, 'qr']);

        Route::get('users', [UserController::class, 'index']);
        Route::put('users/{id}', [UserController::class, 'update']);

        Route::get('notifications', [NotificationController::class, 'index']);
        Route::post('notifications/read-all', [NotificationController::class, 'markAllAsRead']);
        Route::post('notifications/{id}/read', [NotificationController::class, 'markAsRead']);
        Route::delete('notifications/{id}', [NotificationController::class, 'destroy']);

        Route::get('reports', [ReportController::class, 'index']);
        Route::get('audit-log', [AuditLogController::class, 'index']);
    });
});
