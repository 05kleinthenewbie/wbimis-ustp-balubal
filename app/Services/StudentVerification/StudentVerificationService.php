<?php

namespace App\Services\StudentVerification;

use App\Actions\Fortify\CreateNewUser;
use App\Models\StudentVerification;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Stores student identity documents (Certificate of Registration and an
 * optional student ID image) on the private local disk and tracks the
 * review state. Every approval decision is made manually by an ICT
 * administrator; no document content is parsed or scored.
 */
final class StudentVerificationService
{
    /**
     * Store freshly uploaded documents, replacing any previous copies.
     * Resubmission also returns the application to the pending queue.
     *
     * @param  array<string, string>  $storedPaths  private-disk paths keyed by document type
     */
    public function replaceDocuments(User $user, array $storedPaths): StudentVerification
    {
        $verification = StudentVerification::firstOrNew(['user_id' => $user->id]);
        $verification->user_id = $user->id;
        $directory = 'student-verifications/'.$user->id;
        $replaced = [];

        foreach ($storedPaths as $type => $storedPath) {
            if (! in_array($type, ['cor', 'student_id'], true)) {
                continue;
            }

            $key = $type.'_file_path';
            $replaced[$type] = $verification->getAttribute($key);

            $extension = pathinfo($storedPath, PATHINFO_EXTENSION);
            $target = $directory.'/'.Str::uuid().($extension !== '' ? '.'.$extension : '');
            if (Storage::disk('local')->move((string) $storedPath, $target) === false) {
                throw new \RuntimeException('Document could not be stored.');
            }
            $verification->setAttribute($key, $target);
        }

        $verification->verified_at = now();
        $verification->forceFill(['review_notes' => null, 'reviewed_by' => null, 'reviewed_at' => null]);
        $verification->save();

        // Fresh documents need a fresh review.
        $user->forceFill(['approval_status' => 'pending'])->save();

        foreach ($replaced as $path) {
            $this->deleteDocument($path);
        }

        return $verification;
    }

    /**
     * Move the documents staged during registration into the student's
     * verification record, if the pending OTP round-trip uploaded any.
     */
    public function adoptRegistrationUploads(User $user): void
    {
        $staged = $this->pullRegistrationUploads($user->email);

        if ($staged === []) {
            return;
        }

        $this->replaceDocuments($user, $staged);
        Storage::disk('local')->deleteDirectory(CreateNewUser::pendingUploadDirectory($user->email));
    }

    /**
     * Drain the files stashed for a pending registration, returning them
     * keyed by document type (or an empty array when there is nothing).
     *
     * @return array<string, string>
     */
    public function pullRegistrationUploads(string $email): array
    {
        $directory = CreateNewUser::pendingUploadDirectory($email);
        $disk = Storage::disk('local');

        if (! $disk->directoryExists($directory)) {
            return [];
        }

        $staged = [];

        foreach (['cor', 'student_id'] as $name) {
            $path = $directory.'/'.$name;

            if ($disk->exists($path)) {
                $staged[$name] = $path;
            }
        }

        return $staged;
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
}
