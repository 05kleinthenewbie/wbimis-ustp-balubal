<?php

/*
|--------------------------------------------------------------------------
| Student Verification Configuration
|--------------------------------------------------------------------------
|
| All rules for the student document-verification workflow live here so
| they stay centralized and configurable: the institutional email domain,
| supported programs, scoring weights, review thresholds, upload limits
| and document retention. The verification pipeline is deterministic;
| scores are computed server-side and never accepted from clients.
|
*/

return [

    'php_binary' => env('STUDENT_VERIFICATION_PHP_BINARY', PHP_SAPI === 'cli' ? PHP_BINARY : PHP_BINDIR.'/php'),

    // Institutional domain that earns verification points. Matched exactly
    // and case-insensitively; subdomains such as 8.ustp.edu.ph do not qualify.
    'institutional_domain' => 'ustp.edu.ph',

    // Supported programs. Full names and common abbreviations normalize to
    // the canonical course code recorded on the student ID QR payload.
    'programs' => [
        'BSIT' => [
            'name' => 'Bachelor of Science in Information Technology',
            'aliases' => [
                'bs information technology',
                'bachelor of science in information technology',
                'bs in information technology',
            ],
        ],
        'BTLED' => [
            'name' => 'Bachelor of Technology and Livelihood Education',
            'aliases' => [
                'bachelor of technology and livelihood education',
                'btl ed',
                'technology and livelihood education',
            ],
        ],
        'BAT' => [
            'name' => 'Bachelor of Agricultural Technology',
            'aliases' => [
                'bachelor of agricultural technology',
                'bs agricultural technology',
                'agricultural technology',
            ],
        ],
        'BSA' => [
            'name' => 'Bachelor of Science in Agriculture',
            'aliases' => [
                'bachelor of science in agriculture',
                'bs agriculture',
            ],
        ],
    ],

    // Format of the student number printed on IDs and CORs. Initially a
    // plain ten-digit number; widen or swap the pattern here as needed.
    'student_number_pattern' => '^\d{10}$',

    // QR payloads of the form "FULL NAME<digits><COURSE ABBREVIATION>".
    'qr' => [
        // Maximum bytes we are willing to feed to the decoder.
        'max_image_pixels' => 6000000,

        // Minimum quiet zone, in modules, that generated test IDs keep.
        'quiet_zone_modules' => 4,
    ],

    // Scoring rules. The maximum is the sum of every weight below.
    'scoring' => [
        'email_verified_institutional' => 10,
        'student_id_decoded' => 5,
        'cor_parsed' => 5,
        'student_number_match' => 10,
        'name_match' => 5,
        'program_match' => 5,
    ],

    // Review recommendations by score. Never used to auto-approve:
    'thresholds' => [
        'high_priority' => 30,
        'manual_review' => 15,
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
        ],
        // Hard cap on PDF rendering operations to avoid denial of service.
        'cor_max_extracted_characters' => 200000,
    ],

    // COR academic-term handling. When required_academic_year is a string
    // like "2026-2027" the parsed term must match; when null, the values
    // are still validated for shape and flagged for manual review.
    'enrollment' => [
        'required_academic_year' => env('STUDENT_VERIFICATION_ACADEMIC_YEAR') ?: null,
        'required_semester' => env('STUDENT_VERIFICATION_SEMESTER') ?: null,
        'valid_semesters' => [
            '1st Semester',
            '2nd Semester',
            'Summer Semester',
            '1st Sem',
            '2nd Sem',
            'Mid-Year Term',
        ],
    ],

    // OCR fallback for scanned CORs without embedded text. Tesseract is a
    // local binary, not a network service; when it is unavailable the
    // application degrades gracefully and flags the document for review.
    'ocr' => [
        'enabled' => env('STUDENT_VERIFICATION_OCR', true),
        'binary' => env('STUDENT_VERIFICATION_OCR_BINARY', 'tesseract'),
        'pdf_binary' => env('STUDENT_VERIFICATION_PDF_BINARY', 'pdftoppm'),
        'minimum_characters' => 60,
    ],

    // Uploaded evidence older than this many days is deleted from the disk
    // by the students:prune-documents command (registration accounts are
    // never touched, only the stored document copy). Null disables pruning.
    'retention_days' => (int) env('STUDENT_VERIFICATION_RETENTION_DAYS', 730),
];
