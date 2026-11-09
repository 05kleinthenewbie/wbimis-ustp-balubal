<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\StudentApprovalService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class StudentApprovalController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()->isAdministrator(), 403);
        $filter = $request->validate(['status' => ['nullable', 'in:pending,approved,rejected']]);
        $status = $filter['status'] ?? 'pending';
        $users = User::with('studentVerification')->whereHas('role', fn ($query) => $query->where('role_name', 'student'))->where('approval_status', $status);

        return Inertia::render('students/approvals', [
            'applications' => $users->latest('users.created_at')->paginate(25)->withQueryString()->through(fn (User $user) => StudentVerificationController::application($user)),
            'filters' => ['status' => $status],
            'status' => session('status'),
        ]);
    }

    public function decide(Request $request, User $user): RedirectResponse
    {
        abort_unless($request->user()->isAdministrator(), 403);
        abort_unless($user->isStudent(), 404);
        $data = $request->validate(['decision' => ['required', 'in:approved,rejected'], 'reason' => ['required_if:decision,rejected', 'nullable', 'string', 'max:2000']]);
        $this->applyDecision($user, $request->user(), $data['decision'], $data['reason'] ?? null);

        return back()->with('status', 'Student application '.$data['decision'].'.');
    }

    /**
     * Approve or reject several student applications at once.
     */
    public function bulk(Request $request): RedirectResponse
    {
        abort_unless($request->user()->isAdministrator(), 403);
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'distinct'],
            'decision' => ['required', 'in:approved,rejected'],
            'reason' => ['required_if:decision,rejected', 'nullable', 'string', 'max:2000'],
        ]);

        $applications = User::query()->with('studentVerification')
            ->whereHas('role', fn ($query) => $query->where('role_name', 'student'))
            ->whereIn('users.id', $data['ids'])
            ->whereNot('approval_status', $data['decision'])
            ->get();

        foreach ($applications as $user) {
            $this->applyDecision($user, $request->user(), $data['decision'], $data['reason'] ?? null);
        }

        $verb = $data['decision'] === 'approved' ? 'approved' : 'rejected';

        return back()->with('status', count($applications)." student application(s) {$verb}.");
    }

    /**
     * Record the manual review decision, notify the student and email the
     * outcome. Rejections require an administrator-provided reason.
     */
    private function applyDecision(User $user, User $reviewer, string $decision, ?string $reason): void
    {
        app(StudentApprovalService::class)->decide($user, $reviewer, $decision, $reason);
    }

    public function document(Request $request, User $user, string $type): BinaryFileResponse
    {
        abort_unless($request->user()->isAdministrator() && $user->isStudent(), 403);

        return StudentVerificationController::preview($user, $type);
    }
}
