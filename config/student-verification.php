<?php

/*
|--------------------------------------------------------------------------
| Student Verification Configuration
|--------------------------------------------------------------------------
|
| All rules for the student document-review workflow live here so they
| stay centralized and configurable: the supported programs, upload
| limits and document retention. Documents are reviewed manually by an
| ICT administrator; nothing is parsed or scored automatically.
|
*/

return [

    // Supported programs. Keys are the canonical course codes students
    // choose during registration.
    'programs' => [
        'BSIT' => [
            'name' => 'Bachelor of Science in Information Technology',
        ],
        'BTLED' => [
            'name' => 'Bachelor of Technology and Livelihood Education',
        ],
        'BAT' => [
            'name' => 'Bachelor of Agricultural Technology',
        ],
        'BSA' => [
            'name' => 'Bachelor of Science in Agriculture',
        ],
    ],

    // Upload limits. Content is validated with file signatures, not only
    // client-reported MIME types.
    'uploads' => [
        'student_id' => [
            'max_kilobytes' => 8192,
            'accepted_mimes' => ['image/jpeg', 'image/png', 'image/webp'],
        ],
        'cor' => [
            'max_kilobytes' => 15360,
            'accepted_mimes' => ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
        ],
    ],

    // Uploaded evidence older than this many days is deleted from the disk
    // by the students:prune-documents command (registration accounts are
    // never touched, only the stored document copy). Null disables pruning.
    'retention_days' => (int) env('STUDENT_VERIFICATION_RETENTION_DAYS', 730),
];
