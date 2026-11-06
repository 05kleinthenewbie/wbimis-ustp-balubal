<?php

namespace App\Services\StudentVerification;

use Illuminate\Support\Facades\Process;
use Smalot\PdfParser\Parser;

/**
 * Extracts student information from a USTP Certificate of Registration.
 * Direct PDF text extraction runs first; when the document is a scan with
 * no usable text layer, a locally-run OCR fallback (if configured) is
 * attempted. Everything is deterministic label/regex parsing - no AI.
 *
 * @phpstan-type CorResult array{parsed: bool, error: ?string, text_source: ?string, student_number: ?string, name: ?string, program: ?string, course_code: ?string, academic_year: ?string, semester: ?string, registration_number: ?string, university_marker: bool, flags: list<string>}
 */
final class CorParser
{
    public function __construct(
        private ProgramCatalog $catalog,
        private string $studentNumberPattern,
    ) {}

    /**
     * @return array{
     *     parsed: bool,
     *     error: string|null,
     *     text_source: string|null,
     *     student_number: string|null,
     *     name: string|null,
     *     program: string|null,
     *     course_code: string|null,
     *     academic_year: string|null,
     *     semester: string|null,
     *     registration_number: string|null,
     *     university_marker: bool,
     *     flags: array<int, string>,
     * }
     */
    public function parse(string $bytes): array
    {
        $text = $this->extractText($bytes, $source);

        if ($text === null || mb_strlen($text) < (int) config('student-verification.ocr.minimum_characters', 60)) {
            $ocrText = $this->runOcr($bytes);

            if ($ocrText === null) {
                return $this->failure('cor_insufficient_text');
            }

            $text = $ocrText;
            $source = 'ocr';
        }

        $result = $this->fields($text, $source);
        if (! $result['parsed'] && $source !== 'ocr' && config('student-verification.ocr.enabled')) {
            $fallback = $this->runOcr($bytes);
            if ($fallback !== null) {
                return $this->fields($fallback, 'ocr');
            }
        }

        return $result;
    }

    /**
     * @return CorResult
     */
    private function failure(string $error): array
    {
        $fields = array_fill_keys([
            'student_number', 'name', 'program', 'course_code',
            'academic_year', 'semester', 'registration_number',
        ], null);

        return [
            'parsed' => false,
            'error' => $error,
            'text_source' => null,
            ...$fields,
            'university_marker' => false,
            'flags' => [$error],
        ];
    }

    private function extractText(string $bytes, ?string &$source): ?string
    {
        try {
            $parser = new Parser;
            $document = $parser->parseContent($bytes);
            $pages = $document->getPages();

            if ($pages === []) {
                return null;
            }

            $text = '';
            $pageLimit = 6;

            foreach (array_slice($pages, 0, $pageLimit) as $page) {
                $text .= "\n".$page->getText();
            }

            if (trim($text) === '') {
                return null; // Image-only scan: no text layer to recover.
            }

            $maxCharacters = (int) config('student-verification.uploads.cor_max_extracted_characters', 200000);

            if (mb_strlen($text) > $maxCharacters) {
                $text = mb_substr($text, 0, $maxCharacters);
            }

            $source = 'pdf_text';

            return $text;
        } catch (\Throwable) {
            return null;
        }
    }

    private function runOcr(string $bytes): ?string
    {
        if (! (bool) config('student-verification.ocr.enabled', false)) {
            return null;
        }

        $binary = (string) config('student-verification.ocr.binary', 'tesseract');
        $temporary = tempnam(sys_get_temp_dir(), 'cor-');

        if ($temporary === false) {
            return null;
        }

        try {
            file_put_contents($temporary, $bytes);
            $conversion = Process::timeout(20)->run([(string) config('student-verification.ocr.pdf_binary', 'pdftoppm'), '-f', '1', '-l', '1', '-scale-to', '2000', '-png', '-singlefile', $temporary, $temporary]);
            if (! $conversion->successful()) {
                return null;
            }
            $result = Process::timeout(30)->run([$binary, $temporary.'.png', 'stdout', '--psm', '6']);

            return $result->successful() ? $result->output() : null;
        } catch (\Throwable) {
            return null;
        } finally {
            @unlink($temporary);
            @unlink($temporary.'.png');
        }
    }

    /**
     * Extract required fields through deterministic label matching.
     *
     * @return CorResult
     */
    private function fields(string $text, ?string $source): array
    {
        $flattened = (string) preg_replace('/[ \t]+/', ' ', $text);
        $searchable = (string) preg_replace('/\s*\n\s*/', "\n", $flattened);

        $studentNumber = $this->matchStudentNumber($searchable);
        $name = $this->matchName($searchable);
        $program = $this->matchProgram($searchable);
        $academicYear = $this->matchAcademicYear($searchable);
        $semester = $this->matchSemester($searchable);
        $registrationNumber = $this->matchRegistrationNumber($searchable);
        $universityMarker = $this->hasUniversityMarker($searchable);

        $courseCode = $program !== null ? $this->catalog->normalize($program) : null;

        $flags = [];

        $requiredYear = config('student-verification.enrollment.required_academic_year');
        $requiredSemester = config('student-verification.enrollment.required_semester');
        $validYear = $academicYear !== null && preg_match('/^(\d{4})-(\d{4})$/', $academicYear, $years) === 1 && (int) $years[2] === (int) $years[1] + 1;
        $validTerm = $validYear && ($requiredYear === null || $academicYear === $requiredYear) && ($requiredSemester === null || $semester === $requiredSemester) && in_array($semester, config('student-verification.enrollment.valid_semesters'), true);
        if (! $validTerm) {
            $flags[] = 'invalid_academic_term';
        }
        if ($requiredYear === null) {
            $flags[] = 'enrollment_requirements_not_configured';
        }

        if ($name === null) {
            $flags[] = 'cor_field_missing: name';
        }

        if ($studentNumber === null) {
            $flags[] = 'cor_field_missing: student_number';
        }

        if ($program === null) {
            $flags[] = 'cor_field_missing: program';
        }

        if ($courseCode === null) {
            $flags[] = 'unknown_program';
        }

        if ($academicYear === null) {
            $flags[] = 'cor_field_missing: academic_year';
        }

        if ($semester === null) {
            $flags[] = 'cor_field_missing: semester';
        }

        if (! $universityMarker) {
            $flags[] = 'university_header_missing';
        }

        $requiredPresent = $name !== null
            && $studentNumber !== null
            && ($courseCode !== null || $program !== null)
            && $academicYear !== null
            && $semester !== null && $validTerm && $universityMarker;

        return [
            'parsed' => $requiredPresent,
            'error' => null,
            'text_source' => $source,
            'student_number' => $studentNumber,
            'name' => $name,
            'program' => $program,
            'course_code' => $courseCode,
            'academic_year' => $academicYear,
            'semester' => $semester,
            'registration_number' => $registrationNumber,
            'university_marker' => $universityMarker,
            'flags' => $flags,
        ];
    }

    private function matchStudentNumber(string $text): ?string
    {
        $digits = (string) preg_replace('/^\^|\$$/', '', $this->studentNumberPattern);
        $pattern = '/(?:student\s*(?:no|number)|sn|id\s*no)\s*[:.]*\s*('.$digits.')(?!\d)/i';
        preg_match($pattern, $text, $labelled);

        $number = $labelled[1] ?? null;

        if ($number === null) {
            // Unlabelled ten-digit sequences: only accept when exactly one
            // distinct candidate exists so unrelated numbers never win.
            preg_match_all('/(?<![0-9])('.$digits.')(?![0-9])/', $text, $bare);

            if (count(array_unique($bare[1])) === 1) {
                $number = $bare[1][0];
            }
        }

        return $number;
    }

    private function matchName(string $text): ?string
    {
        preg_match('/(?:student\s*name|\bname)\s*[:.]\s*([^\n\r]+)/i', $text, $labelled);

        if (($labelled[1] ?? null) === null) {
            return null;
        }

        $name = trim((string) preg_replace('/\s+/', ' ', $labelled[1]));

        return $name === '' ? null : $name;
    }

    private function matchProgram(string $text): ?string
    {
        preg_match('/(?:program|course)\s*(?:taking|:|\.)\s*([^\n\r]+)/i', $text, $labelled);

        if (($labelled[1] ?? null) !== null) {
            $candidate = trim((string) preg_replace('/\s+/', ' ', $labelled[1]));

            if ($candidate !== '') {
                return $candidate;
            }
        }

        // Unlabelled: the full catalog name appearing verbatim in the text.
        $squished = mb_strtolower((string) preg_replace('/\s+/', ' ', $text));

        foreach ($this->catalog->codes() as $code) {
            $full = $this->catalog->fullName($code);

            if ($full !== null && str_contains($squished, mb_strtolower($full))) {
                return $full;
            }
        }

        return null;
    }

    private function matchAcademicYear(string $text): ?string
    {
        preg_match('/\b(\d{4})\s*[-\x{2013}\x{2014}]\s*(\d{4})\b/u', $text, $year);

        if (! isset($year[1], $year[2])) {
            return null;
        }

        return $year[1].'-'.$year[2];
    }

    private function matchSemester(string $text): ?string
    {
        preg_match('/\b(1st|2nd|first|second|summer|mid[- ]?year)\s*(?:year)?\s*[- ]?\s*(semester|term|sem)\b/i', $text, $semester);

        if (! isset($semester[0])) {
            return null;
        }

        $raw = mb_strtolower((string) preg_replace('/\s+/', ' ', trim($semester[0])));
        $raw = str_replace('first', '1st', str_replace('second', '2nd', $raw));

        if (str_contains($raw, 'summer')) {
            return 'Summer Semester';
        }

        if (str_contains($raw, 'mid')) {
            return 'Mid-Year Term';
        }

        if (str_contains($raw, '2')) {
            return '2nd Semester';
        }

        return '1st Semester';
    }

    private function matchRegistrationNumber(string $text): ?string
    {
        preg_match('/registrat(?:ion)?\s*(?:no|number)\s*[:.]?\s*([A-Za-z0-9\-\/]{4,30})/i', $text, $registration);

        return isset($registration[1]) ? trim($registration[1]) : null;
    }

    private function hasUniversityMarker(string $text): bool
    {
        return str_contains(strtolower($text), 'university of science and technology')
            || str_contains(strtolower($text), 'ustp');
    }
}
