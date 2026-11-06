<?php

namespace App\Services\StudentVerification;

use App\Models\StudentVerification;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;

/**
 * Orchestrates the student document pipeline: validate uploads, persist
 * them on the private local disk, run the deterministic extraction
 * pipeline, cross-validate, score and upsert the application record.
 * Scores and statuses are computed exclusively here; the client never
 * submits them.
 */
final class StudentVerificationService
{
    public function __construct(
        private VerificationEngine $engine,
    ) {}

    /**
     * Store freshly uploaded documents and (re)compute the verification
     * results for the student.
     *
     * @param  array{student_id?: UploadedFile, cor?: UploadedFile}  $uploads
     */
    public function submit(User $user, array $uploads): StudentVerification
    {
        $existing = StudentVerification::where('user_id', $user->id)->first() ?? new StudentVerification;
        $existing->user_id = $user->id;
        $directory = 'student-verifications/'.$user->id;
        $previousId = null;
        $previousCor = null;

        $studentIdFile = $uploads['student_id'] ?? null;
        $corFile = $uploads['cor'] ?? null;

        if ($studentIdFile instanceof UploadedFile) {
            $previousId = $existing->student_id_file_path;
            $stored = $studentIdFile->store($directory, 'local');
            if ($stored === false) {
                throw new \RuntimeException('Student ID could not be stored.');
            }
            $existing->student_id_file_path = $stored;
        }

        if ($corFile instanceof UploadedFile) {
            $previousCor = $existing->cor_file_path;
            $stored = $corFile->store($directory, 'local');
            if ($stored === false) {
                throw new \RuntimeException('COR could not be stored.');
            }
            $existing->cor_file_path = $stored;
        }

        $results = $this->evaluate($existing, $user);

        $existing->student_number = $results['identification']['student_number'];
        $existing->extracted_name = $results['identification']['name'];
        $existing->course_code = $results['identification']['course_code'];
        $existing->verification_results = $results['checks'];
        $existing->verification_score = $results['score'];
        $existing->recommendation = $results['recommendation'];
        $existing->verified_at = now();
        $existing->forceFill(['review_notes' => null, 'reviewed_by' => null, 'reviewed_at' => null, 'approved_student_number' => null]);

        $existing->save();
        $user->forceFill(['approval_status' => 'pending', 'is_approved' => false])->save();
        DB::afterCommit(function () use ($previousId, $previousCor): void {
            $this->deleteDocument($previousId ?? null);
            $this->deleteDocument($previousCor ?? null);
        });

        return $existing;
    }

    /**
     * Delete both stored documents for an account (used on account purge and
     * the retention job).
     */
    public function forget(StudentVerification $verification): void
    {
        $this->deleteDocument($verification->student_id_file_path);
        $this->deleteDocument($verification->cor_file_path);
    }

    private function deleteDocument(?string $path): void
    {
        if (filled($path)) {
            Storage::disk('local')->delete($path);
        }
    }

    /**
     * Run extraction and scoring; returns the raw pipeline data before
     * persistence so callers can reuse pieces (approval queue details).
     *
     * @return array{identification: array{student_number: string|null, name: string|null,
     *     course_code: string|null}, checks: array<string, mixed>, score: int, recommendation: string}
     */
    public function evaluate(StudentVerification $existing, User $user): array
    {
        $studentIdEvidence = $this->studentIdEvidence($existing);
        $corEvidence = $this->corEvidence($existing);

        $checks = $this->engine->evaluate([
            'email' => $user->email,
            'email_verified' => $user->email_verified_at !== null,
            'student_id' => $studentIdEvidence,
            'cor' => $corEvidence,
        ]);

        return [
            'identification' => [
                'student_number' => $checks['student_id_qr']['student_number'] ?? $checks['cor']['student_number'] ?? null,
                'name' => $checks['student_id_qr']['name'] ?? $checks['cor']['name'] ?? null,
                'course_code' => $checks['cor']['course_code'] ?? $checks['student_id_qr']['course'] ?? null,
            ],
            'checks' => $checks,
            'score' => (int) $checks['score'],
            'recommendation' => $checks['recommendation'],
        ];
    }

    /**
     * @return array{decoded: bool, payload: array<string, string>|null, error: string|null, flags: array<int, string>}
     */
    private function studentIdEvidence(StudentVerification $existing): array
    {
        $path = $existing->student_id_file_path;

        if ($path === null || ! Storage::disk('local')->exists($path)) {
            return ['decoded' => false, 'payload' => null, 'error' => 'not_uploaded', 'flags' => ['not_uploaded']];
        }

        try {
            $decoded = $this->process('student_id', $path);
        } catch (\Throwable) {
            $decoded = ['decoded' => false, 'payload' => null, 'error' => 'processing_failed'];
        }

        $payload = $decoded['payload'] ?? null;
        if (($decoded['decoded'] ?? false) === true && is_array($payload)
            && is_string($payload['name'] ?? null) && is_string($payload['student_number'] ?? null) && is_string($payload['course'] ?? null)) {
            return ['decoded' => true, 'payload' => ['name' => $payload['name'], 'student_number' => $payload['student_number'], 'course' => $payload['course']], 'error' => null, 'flags' => []];
        }
        $error = is_string($decoded['error'] ?? null) ? $decoded['error'] : 'processing_failed';

        return ['decoded' => false, 'payload' => null, 'error' => $error, 'flags' => [self::studentIdFlag($error)]];
    }

    /**
     * @return array<string, mixed>
     */
    private function corEvidence(StudentVerification $existing): array
    {
        $path = $existing->cor_file_path;

        if ($path === null || ! Storage::disk('local')->exists($path)) {
            return ['parsed' => false, 'error' => 'not_uploaded', 'flags' => ['not_uploaded']];
        }

        try {
            return $this->process('cor', $path);
        } catch (\Throwable) {
            return ['parsed' => false, 'error' => 'processing_failed', 'flags' => ['processing_failed']];
        }
    }

    /** @return array<string, mixed> */
    private function process(string $type, string $path): array
    {
        $result = Process::timeout(60)->run([
            config('student-verification.php_binary'), '-d', 'memory_limit=256M', base_path('artisan'), 'students:process-document',
            $type, Storage::disk('local')->path($path), '--no-interaction',
        ]);
        if (! $result->successful()) {
            throw new \RuntimeException('Document extraction failed.');
        }
        $data = json_decode(trim($result->output()), true, 512, JSON_THROW_ON_ERROR);
        if (! is_array($data)) {
            throw new \RuntimeException('Document extraction returned no result.');
        }

        return $data;
    }

    private static function studentIdFlag(string $error): string
    {
        return match ($error) {
            'qr_not_found' => 'qr_not_found',
            'qr_payload_unrecognized' => 'qr_payload_unrecognized',
            'image_unreadable' => 'image_unreadable',
            default => $error,
        };
    }

    /**
     * Normalize a course/program string for display in the queue.
     */
    public static function displayProgram(?string $courseCode): ?string
    {
        if ($courseCode === null) {
            return null;
        }

        foreach ((array) config('student-verification.programs') as $code => $program) {
            if (mb_strtoupper($code) === $courseCode) {
                return is_array($program) ? (string) $program['name'] : null;
            }
        }

        return null;
    }
}
