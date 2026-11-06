<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreStudentVerificationRequest;
use App\Models\AuditLog;
use App\Models\User;
use App\Services\BrevoMailService;
use App\Services\StudentVerification\StudentVerificationService;
use App\Services\StudentVerification\VerificationEngine;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class StudentVerificationController extends Controller
{
    public function show(Request $request): Response
    {
        abort_unless($request->user()->isStudent(), 403);

        return Inertia::render('student/verification', [
            'application' => self::application($request->user()),
            'status' => session('status'),
        ]);
    }

    /** @return array<string, mixed> */
    public static function application(User $user): array
    {
        $verification = $user->studentVerification;
        $initial = app(VerificationEngine::class)->evaluate([
            'email' => $user->email, 'email_verified' => $user->email_verified_at !== null,
        ]);
        if ($verification?->verification_results) {
            $old = $verification->verification_results;
            $updated = app(VerificationEngine::class)->evaluate([
                'email' => $user->email, 'email_verified' => $user->email_verified_at !== null,
                'student_id' => ['decoded' => data_get($old, 'student_id_qr.decoded', false), 'payload' => ['name' => data_get($old, 'student_id_qr.name'), 'student_number' => data_get($old, 'student_id_qr.student_number'), 'course' => data_get($old, 'student_id_qr.course')], 'error' => data_get($old, 'student_id_qr.error')],
                'cor' => data_get($old, 'cor'),
            ]);
            // Only refresh email points here; extraction flags remain as submitted.
            $delta = $updated['email_domain']['points'] - data_get($old, 'email_domain.points', 0);
            if (data_get($old, 'email_domain') !== $updated['email_domain']) {
                $old['email_domain'] = $updated['email_domain'];
                $old['score'] += $delta;
                $verification->verification_results = $old;
                $verification->verification_score = $old['score'];
                $old['recommendation'] = VerificationEngine::recommendation($old['score'], $old['flags'] ?? []);
                $verification->verification_results = $old;
                $verification->recommendation = $old['recommendation'];
                $verification->save();
            }
        }

        return [
            'id' => $user->id, 'name' => $user->name, 'email' => $user->email,
            'email_verified' => $user->email_verified_at !== null,
            'approval_status' => $user->approval_status ?? 'pending',
            'student_number' => $verification?->student_number,
            'course_code' => $verification?->course_code,
            'score' => $verification->verification_score ?? $initial['score'],
            'recommendation' => $verification->recommendation ?? $initial['recommendation'],
            'results' => $verification->verification_results ?? $initial,
            'review_notes' => $verification?->review_notes,
            'submitted_at' => $verification?->verified_at?->toIso8601String(),
            'has_student_id' => filled($verification?->student_id_file_path),
            'has_cor' => filled($verification?->cor_file_path),
        ];
    }

    public function store(StoreStudentVerificationRequest $request, StudentVerificationService $service): RedirectResponse
    {
        DB::transaction(function () use ($request, $service): void {
            $user = User::lockForUpdate()->findOrFail($request->user()->id);
            abort_if($user->approval_status === 'approved', 403);
            $service->submit($user, $request->only(['student_id', 'cor']));
            AuditLog::record('Submitted student verification evidence', 'users', $user->id);
        });

        return back()->with('status', 'Documents processed. Your application is awaiting administrator review.');
    }

    public function document(Request $request, string $type): BinaryFileResponse
    {
        abort_unless($request->user()->isStudent(), 403);

        return self::preview($request->user(), $type);
    }

    public static function preview(User $user, string $type): BinaryFileResponse
    {
        abort_unless(in_array($type, ['student_id', 'cor'], true), 404);
        $path = $user->studentVerification?->filePath($type);
        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return response()->file(Storage::disk('local')->path($path), [
            'Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff',
            'Content-Security-Policy' => "default-src 'none'; sandbox",
        ])->setPrivate();
    }

    public function sendEmail(Request $request, BrevoMailService $mail): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->isStudent(), 403);
        if ($user->email_verified_at === null) {
            $url = URL::temporarySignedRoute('student.verification.verify-email', now()->addMinutes(30), ['id' => $user->id, 'hash' => sha1($user->email)]);
            $mail->send([['email' => $user->email, 'name' => $user->name]], 'Verify your student email', '<p>Verify your email to submit student documents:</p><a href="'.e($url).'">Verify email</a>');
        }

        return back()->with('status', 'Verification email sent. The link expires in 30 minutes.');
    }

    public function verifyEmail(Request $request, string $id, string $hash): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->isStudent() && (string) $user->id === $id && hash_equals(sha1($user->email), $hash), 403);
        $user->markEmailAsVerified();

        return redirect()->route('student.verification.show')->with('status', 'Email verified. You can now upload your documents.');
    }
}
