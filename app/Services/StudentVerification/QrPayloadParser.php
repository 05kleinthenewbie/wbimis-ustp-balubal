<?php

namespace App\Services\StudentVerification;

/**
 * Parses the plain-text payload carried by the USTP student ID QR code,
 * e.g. "KLEIN THON B. RACASA 2023303709BSIT".
 *
 * The payload is plain text and freely forgeable, so a successful decode
 * is treated as weak evidence only; cross-document checks and manual
 * review provide the actual assurance.
 */
final class QrPayloadParser
{
    public function __construct(private string $studentNumberPattern) {}

    /**
     * @return array{name: string, student_number: string, course: string}|null
     */
    public function parse(?string $payload): ?array
    {
        $payload = trim((string) preg_replace('/\s+/u', ' ', $payload ?? ''));

        if ($payload === '') {
            return null;
        }

        $coursePart = '(?:[A-Z][A-Z0-9]{0,9})';
        $pattern = '/^([^\d]+?)\s*('.trim($this->studentNumberPattern, '^$').')\s*('.$coursePart.')$/iu';

        if (preg_match($pattern, $payload, $matches) !== 1) {
            return null;
        }

        $name = mb_strtoupper(trim((string) preg_replace('/\s+/', ' ', $matches[1])));
        $studentNumber = $matches[2];
        $course = mb_strtoupper($matches[3]);

        if ($name === '') {
            return null;
        }

        return [
            'name' => $name,
            'student_number' => $studentNumber,
            'course' => $course,
        ];
    }
}
