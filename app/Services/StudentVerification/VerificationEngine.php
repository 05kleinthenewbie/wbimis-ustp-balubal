<?php

namespace App\Services\StudentVerification;

/**
 * Cross-document validation and rule-based scoring. Points come only from
 * the configured weights; the score is advisory evidence strength and is
 * never rendered as proof of authenticity, nor used to auto-approve.
 */
final class VerificationEngine
{
    /** Critical flags that always demand a human look. */
    private const CRITICAL_FLAGS = [
        'student_number_mismatch',
        'student_number_missing',
        'unknown_program',
        'program_mismatch',
    ];

    public function __construct(private ProgramCatalog $catalog) {}

    /**
     * Build the complete verification result bundle.
     *
     * @param  array<string, mixed>  $evidence
     * @return array<string, mixed>
     */
    public function evaluate(array $evidence): array
    {
        $weights = self::weights();
        $institutionalEmail = self::institutionalEmail($evidence['email'] ?? null, $evidence['email_verified'] ?? false);
        $studentId = is_array($evidence['student_id'] ?? null) ? $evidence['student_id'] : null;
        $cor = is_array($evidence['cor'] ?? null) ? $evidence['cor'] : null;

        $qrPayload = is_array($studentId) && ($studentId['decoded'] ?? false) === true
            ? $studentId['payload']
            : null;

        $qrPoints = $qrPayload !== null ? (int) $weights['student_id_decoded'] : 0;
        $corPoints = is_array($cor) && ($cor['parsed'] ?? false) === true
            ? (int) $weights['cor_parsed']
            : 0;

        $idNumber = is_array($qrPayload) ? self::digits($qrPayload['student_number'] ?? null) : null;
        $corNumber = is_array($cor) ? self::digits($cor['student_number'] ?? null) : null;

        $studentNumberCheck = self::studentNumberCheck($idNumber, $corNumber);
        $nameCheck = self::nameCheck(
            is_array($qrPayload) ? ($qrPayload['name'] ?? null) : null,
            is_array($cor) ? ($cor['name'] ?? null) : null,
        );
        $courseCheck = self::courseCheck(
            is_array($qrPayload) ? $this->catalog->normalize($qrPayload['course'] ?? null) : null,
            is_array($cor) ? ($cor['course_code'] ?? null) : null,
        );

        $score = $institutionalEmail['points'] + $qrPoints + $corPoints + $studentNumberCheck['points'] + $nameCheck['points'] + $courseCheck['points'];

        $flags = array_values(array_merge(
            $institutionalEmail['flags'],
            is_array($studentId) ? array_map(fn ($flag) => 'student_id: '.$flag, $studentId['flags'] ?? []) : ['student_id: not_uploaded'],
            is_array($cor) ? array_map(fn ($flag) => 'cor: '.$flag, $cor['flags'] ?? []) : ['cor: not_uploaded'],
            $studentNumberCheck['flags'],
            $nameCheck['flags'],
            $courseCheck['flags'],
        ));
        if ($qrPayload !== null && $this->catalog->normalize($qrPayload['course'] ?? null) === null) {
            $flags[] = 'unknown_program';
        }

        return [
            'email_domain' => $institutionalEmail,
            'student_id_qr' => [
                'decoded' => $qrPayload !== null,
                'name' => is_array($qrPayload) ? ($qrPayload['name'] ?? null) : null,
                'student_number' => $idNumber,
                'course' => is_array($qrPayload) ? ($qrPayload['course'] ?? null) : null,
                'error' => is_array($studentId) ? ($studentId['error'] ?? null) : 'not_uploaded',
                'points' => $qrPoints,
            ],
            'cor' => [
                'parsed' => is_array($cor) && ($cor['parsed'] ?? false) === true,
                'name' => is_array($cor) ? ($cor['name'] ?? null) : null,
                'student_number' => $corNumber,
                'program' => is_array($cor) ? ($cor['program'] ?? null) : null,
                'course_code' => is_array($cor) ? ($cor['course_code'] ?? null) : null,
                'academic_year' => is_array($cor) ? ($cor['academic_year'] ?? null) : null,
                'semester' => is_array($cor) ? ($cor['semester'] ?? null) : null,
                'enrollment_current' => is_array($cor) ? ($cor['enrollment_current'] ?? null) : null,
                'text_source' => is_array($cor) ? ($cor['text_source'] ?? null) : null,
                'error' => is_array($cor) ? ($cor['error'] ?? null) : 'not_uploaded',
                'points' => $corPoints,
            ],
            'student_number_match' => $studentNumberCheck,
            'name_match' => $nameCheck,
            'course_match' => $courseCheck,
            'score' => min($score, array_sum($weights)),
            'maximum_score' => array_sum($weights),
            'recommendation' => self::recommendation($score, $flags),
            'flags' => $flags,
        ];
    }

    /**
     * @return array<string, int>
     */
    public static function weights(): array
    {
        $weights = (array) config('student-verification.scoring');
        $values = array_map(fn ($value) => (int) $value, $weights);

        return $values === [] ? [
            'email_verified_institutional' => 10,
            'student_id_decoded' => 5,
            'cor_parsed' => 5,
            'student_number_match' => 10,
            'name_match' => 5,
            'program_match' => 5,
        ] : $values;
    }

    /**
     * @return array{points: int, domain: string|null, verified: bool, flags: array<int, string>}
     */
    private static function institutionalEmail(mixed $email, bool $verified): array
    {
        $domain = (string) config('student-verification.institutional_domain', 'ustp.edu.ph');
        $email = is_string($email) ? mb_strtolower(trim($email)) : '';
        $at = mb_strrpos($email, '@');
        $host = $at === false ? null : mb_substr($email, $at + 1);

        if ($host === null || $host === '') {
            return ['points' => 0, 'domain' => null, 'verified' => $verified, 'flags' => []];
        }

        if (mb_strtolower($host) !== mb_strtolower($domain)) {
            return ['points' => 0, 'domain' => $host, 'verified' => $verified, 'flags' => []];
        }

        if (! $verified) {
            return [
                'points' => 0,
                'domain' => $domain,
                'verified' => false,
                'flags' => ['email_verified_at_required'],
            ];
        }

        return [
            'points' => (int) self::weights()['email_verified_institutional'],
            'domain' => $domain,
            'verified' => true,
            'flags' => [],
        ];
    }

    /**
     * @return array{match: bool|null, points: int, flags: array<int, string>}
     */
    private static function studentNumberCheck(?string $idNumber, ?string $corNumber): array
    {
        if ($idNumber === null || $corNumber === null) {
            return [
                'match' => null,
                'points' => 0,
                'flags' => [$idNumber === null && $corNumber === null ? 'student_number_missing' : 'student_number_incomplete'],
            ];
        }

        if ($idNumber === $corNumber) {
            return [
                'match' => true,
                'points' => (int) self::weights()['student_number_match'],
                'flags' => [],
            ];
        }

        return ['match' => false, 'points' => 0, 'flags' => ['student_number_mismatch']];
    }

    /**
     * @return array{match: bool|null, points: int, flags: array<int, string>}
     */
    private static function nameCheck(mixed $idName, mixed $corName): array
    {
        $idName = is_string($idName) ? $idName : null;
        $corName = is_string($corName) ? $corName : null;

        if ($idName === null && $corName === null) {
            return ['match' => null, 'points' => 0, 'flags' => ['name_missing']];
        }

        if ($idName === null || $corName === null) {
            $missing = $idName === null ? 'student_id: name_missing' : 'cor: name_missing';

            return ['match' => null, 'points' => 0, 'flags' => [$missing]];
        }

        $result = NameNormalizer::compare($idName, $corName);

        if ($result === 'match') {
            return ['match' => true, 'points' => (int) self::weights()['name_match'], 'flags' => []];
        }

        $flag = $result === 'mismatch' ? 'name_mismatch' : 'name_low_confidence';

        return ['match' => false, 'points' => 0, 'flags' => [$flag]];
    }

    /**
     * @return array{match: bool|null, points: int, flags: array<int, string>}
     */
    private static function courseCheck(mixed $idCourse, mixed $corCourse): array
    {
        $idCourse = is_string($idCourse) ? mb_strtoupper(trim($idCourse)) : null;
        $corCourse = is_string($corCourse) ? mb_strtoupper(trim($corCourse)) : null;

        if ($idCourse === null && $corCourse === null) {
            return ['match' => null, 'points' => 0, 'flags' => ['course_missing']];
        }

        if ($idCourse === null || $corCourse === null) {
            return [
                'match' => null,
                'points' => 0,
                'flags' => [$idCourse === null ? 'student_id: course_missing' : 'cor: course_missing'],
            ];
        }

        if ($idCourse === $corCourse) {
            return ['match' => true, 'points' => (int) self::weights()['program_match'], 'flags' => []];
        }

        return ['match' => false, 'points' => 0, 'flags' => ['program_mismatch']];
    }

    /**
     * Review recommendation from configured thresholds. Scores between
     * high_priority and manual_review are streamlined review tiers; below
     * manual_review the applicant is asked for better evidence.
     *
     * @param  array<int, string>  $flags
     */
    public static function recommendation(int $score, array $flags): string
    {
        $highThreshold = (int) config('student-verification.thresholds.high_priority', 30);
        $manualThreshold = (int) config('student-verification.thresholds.manual_review', 15);

        if ($score < $manualThreshold) {
            return 'evidence_required';
        }

        foreach ($flags as $flag) {
            if (in_array($flag, self::CRITICAL_FLAGS, true) || str_contains($flag, 'unknown_program') || str_contains($flag, 'invalid_academic_term') || str_contains($flag, 'mismatch') || str_contains($flag, 'low_confidence')) {
                return 'manual_review';
            }
        }

        if ($score >= $highThreshold) {
            return 'high_priority';
        }

        return $score >= $manualThreshold ? 'manual_review' : 'evidence_required';
    }

    private static function digits(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $value);

        return filled($digits) ? $digits : null;
    }
}
