<?php

namespace App\Console\Commands;

use App\Models\StudentVerification;
use App\Services\StudentVerification\StudentVerificationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class PruneStudentVerificationDocuments extends Command
{
    protected $signature = 'students:prune-documents';

    protected $description = 'Delete private verification files after the configured retention period';

    public function handle(StudentVerificationService $service): int
    {
        $days = config('student-verification.retention_days');
        if ($days === null || $days <= 0) {
            return self::SUCCESS;
        }

        StudentVerification::where('verified_at', '<', now()->subDays($days))
            ->where(fn ($query) => $query->whereNotNull('student_id_file_path')->orWhereNotNull('cor_file_path'))
            ->chunkById(100, function ($records) use ($service): void {
                foreach ($records as $record) {
                    if ($record->user === null) {
                        continue;
                    }
                    $service->forget($record);
                    $record->forceFill(['student_id_file_path' => null, 'cor_file_path' => null]);
                    $record->save();
                }
            });

        $this->pruneAbandonedRegistrationUploads();

        return self::SUCCESS;
    }

    /**
     * Remove documents staged by registrations that never completed email
     * verification; registrations older than a day abandoned their OTP and
     * their files have no account or application record attached.
     */
    private function pruneAbandonedRegistrationUploads(): void
    {
        $disk = Storage::disk('local');

        foreach ($disk->directories('student-verification-pending') as $directory) {
            if ($disk->lastModified($directory) < now()->subDay()->getTimestamp()) {
                $disk->deleteDirectory($directory);
            }
        }
    }
}
