<?php

namespace App\Http\Controllers\Api\V1;

use App\Events\UserApproved;
use App\Models\AuditLog;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class UserController extends ApiController
{
    /**
     * List pending and active users.
     */
    public function index(): JsonResponse
    {
        $this->ensureAdmin();

        return response()->json([
            'pendingUsers' => User::with('role')
                ->where('is_technician', false)
                ->where('status', 'pending')
                ->latest()
                ->get(),
            'activeUsers' => User::with('role')
                ->where('is_technician', false)
                ->where('status', 'active')
                ->where('id', '!=', $this->user()->id)
                ->latest()
                ->get(),
        ]);
    }

    /**
     * Approve or reject a user account.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $this->ensureAdmin();

        $validated = $request->validate([
            'status' => ['required', 'in:pending,active,inactive,rejected'],
        ]);

        $user = User::findOrFail($id);

        abort_if($user->isTechnician(), 403, 'Technician records do not have login accounts.');

        if ($user->status === 'pending' && $validated['status'] === 'inactive') {
            $validated['status'] = 'rejected';
        }
        if (($user->status === 'rejected' && $validated['status'] !== 'pending') || ($validated['status'] === 'rejected' && $user->status !== 'pending')) {
            throw ValidationException::withMessages(['status' => 'Rejected registrations must return to verification before approval.']);
        }
        if ($validated['status'] === 'active' && ($reason = $user->approval_block_reason) !== null) {
            throw ValidationException::withMessages(['status' => $reason]);
        }

        if ($validated['status'] === 'rejected') {
            AuditLog::record("Rejected and removed registration for {$user->email}", 'users', $user->id);
            $user->purgeAccount();

            return response()->json([
                'message' => 'Registration rejected and removed. The applicant can register again.',
            ]);
        }

        $user->update($validated);

        if ($validated['status'] === 'active') {
            Notification::create([
                'user_id' => $user->id,
                'message' => 'Your account has been approved. You can now log in.',
                'notification_type' => 'account_approval',
                'link' => '/dashboard',
                'notification_status' => 'unread',
            ]);

            if ($user->wasChanged('status')) {
                UserApproved::dispatch($user);
            }
        } elseif (in_array($validated['status'], ['inactive', 'rejected'], true)) {
            Notification::create([
                'user_id' => $user->id,
                'message' => 'Your account registration was not approved. Please contact the ICT office for more information.',
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
