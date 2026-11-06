<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\StudentVerification;
use App\Models\User;
use App\Services\BrevoMailService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class StudentApprovalController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()->isAdministrator(), 403);
        $filter = $request->validate(['status' => ['nullable', 'in:pending,approved,rejected'], 'sort' => ['nullable', 'in:score,newest']]);
        $status = $filter['status'] ?? 'pending';
        $users = User::with('studentVerification')->whereHas('role', fn ($query) => $query->where('role_name', 'student'))->where('approval_status', $status);
        if (($filter['sort'] ?? 'score') === 'score') {
            $users->orderByDesc(StudentVerification::select('verification_score')->whereColumn('user_id', 'users.id')->limit(1));
        }

        return Inertia::render('students/approvals', [
            'applications' => $users->latest('users.created_at')->paginate(25)->withQueryString()->through(fn (User $user) => StudentVerificationController::application($user)),
            'filters' => ['status' => $status, 'sort' => $filter['sort'] ?? 'score'],
            'status' => session('status'),
        ]);
    }

    public function decide(Request $request, User $user): RedirectResponse
    {
        abort_unless($request->user()->isAdministrator(), 403);
        abort_unless($user->isStudent(), 404);
        $data = $request->validate(['decision' => ['required', 'in:approved,rejected'], 'reason' => ['required_if:decision,rejected', 'nullable', 'string', 'max:2000']]);
        DB::transaction(function () use ($user, $data, $request): void {
            // Serialize identity claims, including legacy users without an evidence row.
            DB::table('roles')->where('id', $user->role_id)->lockForUpdate()->first();
            $locked = User::lockForUpdate()->findOrFail($user->id);
            $verification = StudentVerification::where('user_id', $locked->id)->lockForUpdate()->first();
            if ($data['decision'] === 'approved') {
                if ($locked->email_verified_at === null || $verification === null || ! $verification->student_id_file_path || ! $verification->cor_file_path || ! $verification->student_number) {
                    throw ValidationException::withMessages(['decision' => 'Verified email, both documents, and a parsed student number are required.']);
                }
                $duplicate = User::whereKeyNot($locked->id)->where('approval_status', 'approved')->where(function ($query) use ($verification): void {
                    $query->where('id_number', $verification->student_number)->orWhereHas('studentVerification', fn ($q) => $q->where('student_number', $verification->student_number));
                })->exists();
                if ($duplicate || StudentVerification::where('approved_student_number', $verification->student_number)->where('user_id', '!=', $locked->id)->exists()) {
                    throw ValidationException::withMessages(['decision' => 'This student number already belongs to an approved account.']);
                }
            }
            $previous = $locked->approval_status;
            $locked->forceFill(['approval_status' => $data['decision'], 'is_approved' => $data['decision'] === 'approved'])->save();
            $verification ??= new StudentVerification;
            $verification->user_id = $locked->id;
            $verification->forceFill([
                'reviewed_by' => $request->user()->id, 'reviewed_at' => now(),
                'review_notes' => $data['reason'] ?? null,
                'approved_student_number' => $data['decision'] === 'approved' ? $verification->student_number : null,
            ])->save();
            AuditLog::record('Student application '.$data['decision'], 'users', $locked->id, null, ['approval_status' => $previous], ['approval_status' => $data['decision']]);
        });
        try {
            app(BrevoMailService::class)->sendStudentRegistrationDecisionEmail($user->email, $user->name, $data['decision'], $data['reason'] ?? null);
        } catch (\Throwable) {
            // The recorded decision remains authoritative if mail delivery fails.
        }

        return back()->with('status', 'Student application '.$data['decision'].'.');
    }

    public function document(Request $request, User $user, string $type): BinaryFileResponse
    {
        abort_unless($request->user()->isAdministrator() && $user->isStudent(), 403);

        return StudentVerificationController::preview($user, $type);
    }
}
