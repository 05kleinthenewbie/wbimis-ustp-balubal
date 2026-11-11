<?php

use App\Http\Controllers\AttachmentController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\FacilityController;
use App\Http\Controllers\IncidentReportController;
use App\Http\Controllers\InventoryItemController;
use App\Http\Controllers\JobOrderController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PushSubscriptionController;
use App\Http\Controllers\RegisterOtpController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ServiceRequestController;
use App\Http\Controllers\StudentApprovalController;
use App\Http\Controllers\StudentLoginController;
use App\Http\Controllers\StudentPasswordResetLinkController;
use App\Http\Controllers\StudentVerificationController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\UserLiabilityController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/health', fn () => response()->json(['ok' => true]))->name('health');

Route::inertia('/', 'welcome')->name('home');

Route::inertia('/terms', 'terms')->name('terms');
Route::inertia('/privacy-policy', 'privacy-policy')->name('privacy');
Route::inertia('/data-privacy', 'data-privacy')->name('data-privacy');
Route::inertia('/acceptable-use', 'acceptable-use')->name('acceptable-use');

Route::inertia('approval-pending', 'approval-pending')
    ->middleware('auth')
    ->name('approval.pending');

Route::middleware('guest')->group(function () {
    Route::get('/faculty/login', fn () => Inertia::render('auth/faculty-login', [
        'canResetPassword' => Features::enabled(Features::resetPasswords()),
        'status' => session('status'),
    ]))->name('faculty.login');
    Route::get('/admin/login', fn () => Inertia::render('auth/login', [
        'canResetPassword' => Features::enabled(Features::resetPasswords()),
        'status' => session('status'),
        'portal' => 'admin',
    ]))->name('admin.login');
    Route::get('/student/login', [StudentLoginController::class, 'create'])->name('student.login');
    Route::post('/student/login', [StudentLoginController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('student.authenticate');
    Route::get('/student/forgot-password', [StudentPasswordResetLinkController::class, 'create'])
        ->name('student.password.request');
    Route::post('/student/forgot-password', [StudentPasswordResetLinkController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('student.password.email');
    Route::get('/register/otp', [RegisterOtpController::class, 'show'])->name('register.otp.show');
    Route::post('/register/otp', [RegisterOtpController::class, 'verify'])->name('register.otp.verify');
    Route::post('/register/otp/resend', [RegisterOtpController::class, 'resend'])->name('register.otp.resend');
});

Route::middleware(['auth', 'verified', 'approved'])->group(function () {
    Route::get('students/approvals', [StudentApprovalController::class, 'index'])->name('students.approvals');
    Route::patch('students/approvals/bulk-decision', [StudentApprovalController::class, 'bulk'])->name('students.bulk-decision');
    Route::patch('students/{user}/decision', [StudentApprovalController::class, 'decide'])->name('students.decision');
    Route::get('students/{user}/documents/{type}', [StudentApprovalController::class, 'document'])->name('students.document');
    Route::get('push-subscriptions/config', [PushSubscriptionController::class, 'show'])->name('push-subscriptions.show');
    Route::post('push-subscriptions', [PushSubscriptionController::class, 'store'])->middleware('throttle:20,1')->name('push-subscriptions.store');
    Route::delete('push-subscriptions', [PushSubscriptionController::class, 'destroy'])->middleware('throttle:20,1')->name('push-subscriptions.destroy');
    Route::get('dashboard', DashboardController::class)->name('dashboard');
    Route::get('requests/approvals', [ServiceRequestController::class, 'approvals'])->name('requests.approvals');
    Route::get('job-orders/assignments', [JobOrderController::class, 'assignments'])->name('job-orders.assignments');
    Route::get('job-orders/progress', [JobOrderController::class, 'progress'])->name('job-orders.progress');
    Route::put('job-orders/{jobOrder}/assign', [JobOrderController::class, 'assign'])->name('job-orders.assign');
    Route::resource('requests', ServiceRequestController::class)->except(['edit', 'destroy']);
    Route::resource('job-orders', JobOrderController::class)->only(['index', 'show', 'update']);
    Route::get('job-orders/{jobOrder}/print', [JobOrderController::class, 'print'])->name('job-orders.print');
    Route::post('job-orders/{jobOrder}/responses', [JobOrderController::class, 'addResponse'])->name('job-orders.responses.store');
    Route::post('job-orders/{jobOrder}/rate', [JobOrderController::class, 'rate'])->name('job-orders.rate');
    Route::post('job-orders/{jobOrder}/verify', [JobOrderController::class, 'verify'])->name('job-orders.verify');
    Route::get('bookings/approvals', [BookingController::class, 'approvals'])->name('bookings.approvals');
    Route::resource('bookings', BookingController::class)->except(['edit', 'destroy']);
    Route::resource('facilities', FacilityController::class)->except(['show']);
    Route::resource('incidents', IncidentReportController::class)->except(['edit', 'destroy']);
    Route::get('inventory/expirations', [InventoryItemController::class, 'expirations'])->name('inventory.expirations');
    Route::get('inventory/defective', [InventoryItemController::class, 'defective'])->name('inventory.defective-index');
    Route::get('inventory/under-repair', [InventoryItemController::class, 'underRepair'])->name('inventory.under-repair-index');
    Route::resource('inventory', InventoryItemController::class);
    Route::get('inventory/{id}/qr', [InventoryItemController::class, 'qr'])->name('inventory.qr');
    Route::post('inventory/{id}/defective', [InventoryItemController::class, 'flagDefective'])->name('inventory.defective.store');
    Route::patch('inventory/{id}/mark-disposal', [InventoryItemController::class, 'markDisposal'])->name('inventory.mark-disposal');
    Route::patch('inventory/{id}/defective/{defectiveId}', [InventoryItemController::class, 'updateRepairStatus'])->name('inventory.defective.update');
    Route::post('incidents/{incident}/liabilities/{liability}/resolve', [IncidentReportController::class, 'resolveLiability'])->name('incidents.liabilities.resolve');
    Route::get('incidents/{incident}/attachments/{attachment}', [IncidentReportController::class, 'downloadAttachment'])->name('incidents.attachments.download');
    Route::get('reports', [ReportController::class, 'index'])->name('reports.index');
    Route::get('reports/export', [ReportController::class, 'export'])->name('reports.export');
    Route::get('attachments/{attachment}/download', [AttachmentController::class, 'download'])->name('attachments.download');
    Route::get('liabilities', [UserLiabilityController::class, 'index'])->name('liabilities.index');
    Route::post('liabilities/{liability}/acknowledge', [UserLiabilityController::class, 'acknowledge'])->name('liabilities.acknowledge');
    Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('notifications/{notification}/read', [NotificationController::class, 'markAsRead'])->name('notifications.read');
    Route::post('notifications/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.read-all');
    Route::delete('notifications/{notification}', [NotificationController::class, 'destroy'])->name('notifications.destroy');
    Route::get('audit-log', [AuditLogController::class, 'index'])->name('audit-log.index');
    Route::get('users/approvals', [UserController::class, 'approvals'])->name('users.approvals');
    Route::patch('users/approvals/bulk-decision', [UserController::class, 'bulk'])->name('users.bulk-decision');
    Route::patch('users/{user}/approve', [UserController::class, 'approve'])->name('users.approve');
    Route::patch('users/{user}/reject', [UserController::class, 'reject'])->name('users.reject');
    Route::patch('users/{user}/revoke-approval', [UserController::class, 'revokeApproval'])->name('users.revoke-approval');
    Route::resource('users', UserController::class)->only(['index', 'update']);
    Route::post('technicians', [UserController::class, 'storeTechnician'])->name('technicians.store');
});

require __DIR__.'/settings.php';

Route::middleware('auth')->prefix('student/verification')->name('student.verification.')->group(function () {
    Route::get('/', [StudentVerificationController::class, 'show'])->name('show');
    Route::post('/', [StudentVerificationController::class, 'store'])->middleware('throttle:5,1')->name('store');
    Route::get('documents/{type}', [StudentVerificationController::class, 'document'])->name('document');
    Route::post('email', [StudentVerificationController::class, 'sendEmail'])->middleware('throttle:3,1')->name('send-email');
    Route::get('email/{id}/{hash}', [StudentVerificationController::class, 'verifyEmail'])->middleware(['signed', 'throttle:6,1'])->name('verify-email');
});
