<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StudentRoster extends Model
{
    /**
     * Student programs accepted on the roster and during registration.
     */
    public const PROGRAMS = ['BSA', 'BAT', 'BSIT', 'BTLED'];

    protected $fillable = [
        'user_id',
        'id_number',
        'name',
        'program',
        'email',
    ];

    /**
     * Get the user account provisioned for this roster entry.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function enrollmentRecords(): HasMany
    {
        return $this->hasMany(StudentRosterEnrollment::class, 'student_roster_id');
    }
}
