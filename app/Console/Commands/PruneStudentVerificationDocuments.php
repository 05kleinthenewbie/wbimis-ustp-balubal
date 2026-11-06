<?php

namespace App\Console\Commands;

use App\Models\StudentVerification;
use App\Services\StudentVerification\StudentVerificationService;
use Illuminate\Console\Command;

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
                    $result = $service->evaluate($record, $record->user);
                    $record->verification_results = $result['checks'];
                    $record->verification_score = $result['score'];
                    $record->recommendation = $result['recommendation'];
                    $record->save();
                }
            });

        return self::SUCCESS;
    }
}
