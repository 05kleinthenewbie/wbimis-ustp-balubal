<?php

namespace App\Http\Controllers\Api\V1;

use App\Events\UserApproved;
use App\Models\AuditLog;
use App\Models\Notification;
use App\Models\User;
use App\Services\BrevoMailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends ApiController
{
    /**
     * List active and deactivated users.
     */
    public function index(): JsonResponse
    {
        $this->ensureAdmin();

        return response()->json([
            'activeUsers' => User::with('role')
                ->where('is_technician', false)
                ->where('status', 'active')
                ->where('id', '!=', $this->user()->id)
                ->latest()
                ->get(),
            'deactivatedUsers' => User::with('role')
                ->where('is_technician', false)
                ->where('status', 'inactive')
                ->where('id', '!=', $this->user()->id)
                ->latest()
                ->get(),
        ]);
    }

    /**
     * Activate or deactivate a user account.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $this->ensureAdmin();

        $validated = $request->validate([
            'status' => ['required', 'in:active,inactive'],
        ]);

        $user = User::query()->with('role')->lockForUpdate()->findOrFail($id);

        abort_if($user->isTechnician(), 403, 'Technician records do not have login accounts.');

        $previousStatus = $user->status;

        if ($previousStatus === $validated['status']) {
            return response()->json(['message' => 'User account updated successfully.', 'user' => $user->load('role')]);
        }

        $user->update(['status' => $validated['status']]);

        if ($validated['status'] === 'active') {
            Notification::create([
                'user_id' => $user->id,
                'message' => 'Your account has been reactivated. You can now log in.',
                'notification_type' => 'account_approval',
                'link' => '/dashboard',
                'notification_status' => 'unread',
            ]);

            if ($user->wasChanged('status')) {
                if ($user->role?->role_name === 'student') {
                    try {
                        app(BrevoMailService::class)->sendStudentRegistrationDecisionEmail($user->email, $user->name, 'approved', null);
                    } catch (\Throwable $exception) {
                        report($exception);
                    }
                }
                UserApproved::dispatch($user);
            }
        } else {
            Notification::create([
                'user_id' => $user->id,
                'message' => 'Your account has been deactivated. Please contact the ICT office for more information.',
                'notification_type' => 'account_rejection',
                'link' => '/dashboard',
                'notification_status' => 'unread',
            ]);
        }

        AuditLog::record("Set user status to {$validated['status']}", 'users', $user->id);

        return response()->json([
            'message' => 'User account updated successfully.',
            'user' => $user->load('role'),
        ]);
    }
}
