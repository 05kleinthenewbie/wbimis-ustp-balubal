<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentVerificationLog extends Model
{
    protected $fillable = [
        'user_id',
        'admin_user_id',
        'verification_method',
        'result',
        'failure_reason',
        'details',
        'verified_at',
    ];

    protected function casts(): array
    {
        return [
            'details' => 'array',
            'verified_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_user_id');
    }
}
