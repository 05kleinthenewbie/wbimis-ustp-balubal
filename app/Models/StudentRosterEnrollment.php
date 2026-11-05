<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentRosterEnrollment extends Model
{
    protected $fillable = [
        'student_roster_id',
        'year_level',
        'registration_number',
        'academic_year',
        'semester',
        'status',
    ];

    public function studentRoster(): BelongsTo
    {
        return $this->belongsTo(StudentRoster::class);
    }
}
