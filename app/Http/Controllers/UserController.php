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
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

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
            'pendingUsers' => User::with('role')
                ->where('is_technician', false)
                ->where('status', 'pending')
                ->latest()
                ->get()
                ->each->append(['employment_document_url']),
            'activeUsers' => User::with('role')
                ->where('is_technician', false)
                ->where('status', 'active')
                ->where('id', '!=', Auth::id())
                ->latest()
                ->get()
                ->each->append(['employment_document_url']),
            'deactivatedUsers' => User::with('role')
                ->where('is_technician', false)
                ->where('status', 'inactive')
                ->where('id', '!=', Auth::id())
                ->latest()
                ->get()
                ->each->append(['employment_document_url']),
            'rejectedUsers' => User::with('role')
                ->where('is_technician', false)
                ->where('status', 'rejected')
                ->whereDoesntHave('role', fn ($query) => $query->where('role_name', 'student'))
                ->latest()
                ->get()
                ->each->append(['employment_document_url']),
        ]);
    }

    public function downloadEmploymentDocument(User $user): StreamedResponse
    {
        $this->ensureAdmin();

        abort_unless(filled($user->employment_document_path) && Storage::disk('local')->exists((string) $user->employment_document_path), 404);

        return Storage::disk('local')->download(
            (string) $user->employment_document_path,
            $user->employment_document_original_name ?: 'employment-document.pdf',
        );
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
            'email' => ['nullable', 'email', 'max:255', 'unique:users,email'],
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
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): RedirectResponse
    {
        $this->ensureAdmin();

        $validated = $request->validate([
            'status' => ['required', 'in:pending,active,inactive,rejected'],
            'reason' => ['nullable', 'string', 'max:2000', 'required_if:status,rejected'],
        ]);

        $user = User::with('role')->findOrFail($id);

        $this->changeStatus($user, $validated['status'], $validated['reason'] ?? null);

        return redirect()->back()->with('status', 'User account updated successfully.');
    }

    private function changeStatus(User $user, string $status, ?string $reason = null): void
    {
        if ($user->isTechnician()) {
            throw ValidationException::withMessages([
                'status' => 'Technician records are not login accounts and cannot be activated or deactivated.',
            ]);
        }

        $previousStatus = $user->status;

        if ($previousStatus === 'pending' && $status === 'inactive') {
            $status = 'rejected';
        }

        if (($status === 'rejected' && $previousStatus !== 'pending') || ($previousStatus === 'rejected' && $status !== 'pending')) {
            throw ValidationException::withMessages(['status' => 'Rejected registrations must return to verification before approval.']);
        }

        if ($previousStatus === $status) {
            return;
        }

        if ($status === 'rejected') {
            Notification::create([
                'user_id' => $user->id,
                'message' => filled($reason)
                    ? 'Your account registration needs correction: '.$reason
                    : 'Your account registration was not approved. Contact the ICT office for review.',
                'notification_type' => 'account_rejection',
                'notification_status' => 'unread',
            ]);
            if ($user->role?->role_name === 'student') {
                try {
                    app(BrevoMailService::class)->sendStudentRegistrationDecisionEmail(
                        $user->email,
                        $user->name,
                        'rejected',
                        $reason,
                    );
                } catch (\Throwable $exception) {
                    report($exception);
                }
            }
            AuditLog::record(
                "Rejected and removed registration for {$user->email}",
                'users',
                $user->id,
                null,
                ['status' => $previousStatus],
                ['status' => 'rejected'],
            );

            if ($user->role?->role_name === 'student') {
                $user->update(['status' => 'rejected']);
            } else {
                $user->purgeAccount();
            }

            return;
        }

        $user->update(['status' => $status]);

        if ($status === 'active') {
            Notification::create([
                'user_id' => $user->id,
                'message' => $previousStatus === 'inactive'
                    ? 'Your account has been reactivated. You can now log in.'
                    : 'Your account has been approved. You can now log in.',
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
        } elseif ($status === 'inactive') {
            Notification::create([
                'user_id' => $user->id,
                'message' => $previousStatus === 'active'
                    ? 'Your account has been deactivated. Please contact the ICT office for more information.'
                    : 'Your account registration was not approved. Please contact the ICT office for more information.',
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
