<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One application record per student account: the uploaded documents (kept
 * on the private local disk) and the manual review state recorded by the
 * administrator.
 *
 * @property int $id
 * @property int $user_id
 * @property string|null $student_id_file_path
 * @property string|null $cor_file_path
 * @property string|null $review_notes
 * @property int|null $reviewed_by
 * @property CarbonInterface|null $reviewed_at
 * @property CarbonInterface|null $verified_at
 * @property CarbonInterface|null $created_at
 * @property CarbonInterface|null $updated_at
 */
#[Fillable([
    'student_id_file_path',
    'cor_file_path',
])]
#[Hidden(['student_id_file_path', 'cor_file_path'])]
class StudentVerification extends Model
{
    protected function casts(): array
    {
        return [
            'reviewed_at' => 'datetime',
            'verified_at' => 'datetime',
        ];
    }

    /**
     * The student account this application belongs to.
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
