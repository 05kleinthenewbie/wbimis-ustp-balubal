<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Structured evidence bundle for one student's verification application.
 * The rows are upserted on resubmission, so an account always has at most
 * one application record; per-check results live in verification_results.
 *
 * @property int $id
 * @property int $user_id
 * @property string|null $student_number
 * @property string|null $extracted_name
 * @property string|null $course_code
 * @property string|null $student_id_file_path
 * @property string|null $cor_file_path
 * @property array<string, mixed>|null $verification_results
 * @property int $verification_score
 * @property string|null $recommendation
 * @property string|null $review_notes
 * @property int|null $reviewed_by
 * @property CarbonInterface|null $reviewed_at
 * @property CarbonInterface|null $verified_at
 * @property CarbonInterface|null $created_at
 * @property CarbonInterface|null $updated_at
 */
#[Fillable([
    'student_number',
    'extracted_name',
    'course_code',
    'student_id_file_path',
    'cor_file_path',
    'verification_results',
    'verification_score',
    'recommendation',
])]
#[Hidden(['student_id_file_path', 'cor_file_path', 'approved_student_number'])]
class StudentVerification extends Model
{
    protected function casts(): array
    {
        return [
            'verification_results' => 'array',
            'verification_score' => 'integer',
            'reviewed_at' => 'datetime',
            'verified_at' => 'datetime',
        ];
    }

    /**
     * The student account this evidence belongs to.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The administrator who recorded the approval decision.
     *
     * @return BelongsTo<User, $this>
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    /**
     * Individual check result, e.g. 'student_number_match'.
     *
     * @return array<string, mixed>
     */
    public function result(string $key): array
    {
        return data_get($this->verification_results, $key, []);
    }

    /**
     * Names of every mismatch or manual-review flag recorded on the checks.
     *
     * @return array<int, string>
     */
    public function flags(): array
    {
        $flags = data_get($this->verification_results, 'flags', []);

        return is_array($flags) ? $flags : [];
    }

    /**
     * The uploaded file path on the private local disk, or null when the
     * document has never been uploaded.
     */
    public function filePath(string $type): ?string
    {
        return match ($type) {
            'student_id' => $this->student_id_file_path,
            'cor' => $this->cor_file_path,
            default => null,
        };
    }
}
