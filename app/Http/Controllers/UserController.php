<?php

namespace App\Http\Controllers;

use App\Events\UserApproved;
use App\Models\AuditLog;
use App\Models\Notification;
use App\Models\Role;
use App\Models\User;
use App\Services\BrevoMailService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    /**
     * Ensure only ICT Admins can manage users.
     */
    private function ensureAdmin(): void
    {
        if (Auth::user()->role->role_name !== 'ict_admin') {
            abort(403, 'Only ICT Admins can manage user accounts.');
        }
    }

    /**
     * Display a listing of the resource.
     */
    public function index(): Response
    {
        $this->ensureAdmin();

        return Inertia::render('users/index', [
            'status' => session('status'),
            'error' => session('error'),
            'activeUsers' => User::with('role')
                ->where('is_technician', false)
                ->where('status', 'active')
                ->where('id', '!=', Auth::id())
                ->latest()
                ->get(),
            'deactivatedUsers' => User::with('role')
                ->where('is_technician', false)
                ->where('status', 'inactive')
                ->where('id', '!=', Auth::id())
                ->latest()
                ->get(),
        ]);
    }

    /**
     * Create a new technician record for job order assignments.
     *
     * The technician account is managed by the admin only; no login
     * credentials are issued, so a random unusable password is set.
     */
    public function storeTechnician(Request $request): RedirectResponse
    {
        $this->ensureAdmin();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'department' => ['nullable', 'string', 'max:100'],
            'expertise' => ['nullable', 'string', 'max:150'],
            'contact_no' => ['nullable', 'string', 'max:20', 'regex:/^[0-9+\-\s()]{7,20}$/'],
            'email' => ['nullable', 'email', 'max:191', 'unique:users,email'],
        ], [
            'contact_no.regex' => 'Please enter a valid Philippine phone number (e.g. 0917 123 4567).',
        ]);

        $technician = User::create([
            'name' => $validated['name'],
            'department' => $validated['department'] ?? null,
            'expertise' => $validated['expertise'] ?? null,
            'contact_no' => $validated['contact_no'] ?? null,
            'email' => $validated['email'] ?? 'technician-'.Str::lower(Str::random(12)).'@no-login.local',
            'password' => Hash::make(Str::random(40)),
            'role_id' => Role::firstOrCreate(['role_name' => 'ict_admin'])->id,
            'status' => 'active',
            'is_technician' => true,
        ]);

        AuditLog::record(
            'Added new technician '.$technician->name,
            'users',
            $technician->id,
        );

        return redirect()->back()->with('status', 'Technician added successfully.');
    }

    /**
     * Activate or deactivate a user account.
     */
    public function update(Request $request, string $id): RedirectResponse
    {
        $this->ensureAdmin();

        $validated = $request->validate([
            'status' => ['required', 'in:active,inactive'],
        ]);

        $user = User::with('role')->findOrFail($id);

        $this->changeStatus($user, $validated['status']);

        return redirect()->back()->with('status', 'User account updated successfully.');
    }

    /**
     * Show the pending account approvals panel: registered users whose
     * email has been verified but whose account still awaits approval.
     */
    public function approvals(): Response
    {
        $this->ensureAdmin();

        $pendingUsers = User::query()
            ->with('role')
            ->where('is_technician', false)
            ->where('is_approved', false)
            ->whereDoesntHave('role', fn ($query) => $query->where('role_name', 'student'))
            ->whereNotNull('email_verified_at')
            ->whereNotIn('status', ['inactive', 'rejected'])
            ->where('id', '!=', Auth::id())
            ->latest()
            ->get();

        return Inertia::render('users/approvals', [
            'status' => session('status'),
            'error' => session('error'),
            'pendingUsers' => $pendingUsers,
        ]);
    }

    /**
     * Approve a pending account so it can access the application.
     */
    public function approve(Request $request, string $id): RedirectResponse
    {
        $this->ensureAdmin();

        $user = User::with('role')->findOrFail($id);

        $this->approveAccount($user);

        return redirect()->route('users.approvals')->with(
            'status',
            $user->name.'\'s account has been approved.',
        );
    }

    /**
     * Revoke an account approval. The change takes effect immediately,
     * including for any currently logged-in session.
     */
    public function revokeApproval(Request $request, string $id): RedirectResponse
    {
        $this->ensureAdmin();

        $user = User::with('role')->findOrFail($id);

        if ($user->isStudent()) {
            throw ValidationException::withMessages(['revoke' => 'Use Student Approvals to revoke a student approval with a reason.']);
        }

        if ($user->isTechnician()) {
            throw ValidationException::withMessages([
                'revoke' => 'Technician records are not login accounts and do not need approval.',
            ]);
        }

        if ($user->isAdministrator()) {
            throw ValidationException::withMessages([
                'revoke' => 'Administrator accounts cannot have their approval revoked.',
            ]);
        }

        if (! $user->is_approved) {
            return redirect()->route('users.approvals');
        }

        $user->update(['is_approved' => false]);

        Notification::create([
            'user_id' => $user->id,
            'message' => 'Your account approval has been revoked. Please contact the ICT office for more information.',
            'notification_type' => 'account_rejection',
            'link' => '/dashboard',
            'notification_status' => 'unread',
        ]);

        AuditLog::record(
            'Revoked account approval',
            'users',
            $user->id,
            null,
            ['is_approved' => true],
            ['is_approved' => false],
        );

        return redirect()->route('users.approvals')->with(
            'status',
            'Account approval revoked. The user must be approved again to access the system.',
        );
    }

    /**
     * Mark an account as approved, notify the user and email students the
     * registration decision, mirroring the account reactivation flow.
     */
    private function approveAccount(User $user): void
    {
        if ($user->isStudent()) {
            throw ValidationException::withMessages(['approve' => 'Use Student Approvals to review the student documents.']);
        }
        if ($user->isTechnician()) {
            throw ValidationException::withMessages([
                'approve' => 'Technician records are not login accounts and do not need approval.',
            ]);
        }

        if ($user->email_verified_at === null) {
            throw ValidationException::withMessages([
                'approve' => 'The user must verify their email address before the account can be approved.',
            ]);
        }

        if ($user->is_approved) {
            return;
        }

        $user->update(['is_approved' => true, 'status' => 'active']);

        Notification::create([
            'user_id' => $user->id,
            'message' => 'Your account has been approved. You can now log in.',
            'notification_type' => 'account_approval',
            'link' => '/dashboard',
            'notification_status' => 'unread',
        ]);

        if ($user->role?->role_name === 'student') {
            try {
                app(BrevoMailService::class)->sendStudentRegistrationDecisionEmail(
                    $user->email,
                    $user->name,
                    'approved',
                    null,
                );
            } catch (\Throwable $exception) {
                report($exception);
            }
        }

        if ($user->wasChanged('is_approved')) {
            DB::afterCommit(fn () => UserApproved::dispatch($user));
        }

        AuditLog::record(
            'Approved the account registration',
            'users',
            $user->id,
            null,
            ['is_approved' => false],
            ['is_approved' => true],
        );
    }

    private function changeStatus(User $user, string $status): void
    {
        if ($user->isTechnician()) {
            throw ValidationException::withMessages([
                'status' => 'Technician records are not login accounts and cannot be activated or deactivated.',
            ]);
        }

        $previousStatus = $user->status;

        if ($previousStatus === $status) {
            return;
        }

        $user->update(['status' => $status]);

        if ($status === 'active') {
            Notification::create([
                'user_id' => $user->id,
                'message' => 'Your account has been reactivated. You can now log in.',
                'notification_type' => 'account_approval',
                'link' => '/dashboard',
                'notification_status' => 'unread',
            ]);

            if ($user->role?->role_name === 'student') {
                try {
                    app(BrevoMailService::class)->sendStudentRegistrationDecisionEmail(
                        $user->email,
                        $user->name,
                        'approved',
                        null,
                    );
                } catch (\Throwable $exception) {
                    report($exception);
                }
            }

            if ($user->wasChanged('status')) {
                DB::afterCommit(fn () => UserApproved::dispatch($user));
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

        AuditLog::record(
            "Set user status to {$status}",
            'users',
            $user->id,
            null,
            ['status' => $previousStatus],
            ['status' => $user->status],
        );
    }
}
