<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Smalot\PdfParser\Document;
use Smalot\PdfParser\Parser;
use Throwable;

class CorVerificationService
{
    public function __construct(private Parser $parser) {}

    public function verify(User $user): void
    {
        $disk = Storage::disk('local');
        $details = ['message' => 'Student ID or COR is missing. Upload or review the document manually.', 'checks' => []];
        $status = 'manual_review';

        if (filled($user->cor_path) && $disk->exists($user->cor_path)) {
            try {
                if ($disk->mimeType($user->cor_path) !== 'application/pdf') {
                    $details['message'] = 'Images require manual review. Automatic matching supports text-based PDFs.';
                } else {
                    $text = $this->extractText($this->parser->parseContent($disk->get($user->cor_path)));
                    $details = $this->matchDetails($user, $text);
                    $status = $details['checks'] === [] ? 'manual_review'
                        : (collect($details['checks'])->every(fn (array $check): bool => $check['matches']) ? 'matched' : 'mismatch');
                }
            } catch (Throwable $exception) {
                report($exception);
                $details['message'] = 'The PDF could not be read. It may be scanned, protected, or damaged. Review it manually.';
            }
        }

        $user->forceFill([
            'cor_verification_status' => $status,
            'cor_verification_details' => $details,
            'cor_checked_at' => now(),
        ])->save();
    }

    /** @return array{message: string, checks: array<string, array{expected: string, actual: string, matches: bool}>} */
    public function matchDetails(User $user, string $text): array
    {
        if (trim($text) === '') {
            return ['message' => 'No readable PDF text was found. Review this student ID or COR manually.', 'checks' => []];
        }

        $id = $this->field($text, '(?:(?:Student\s*)?ID(?:\s*(?:No\.?|Number))?|Student\s*(?:No\.?|Number))', 'College|Name|Program|Course');
        $name = $this->field($text, 'Name', 'Program|Course|Gender|College');
        $program = $this->field($text, '(?:Program|Course)', 'Major|Gender|Curriculum|Year\s*Level');
        $programNames = [
            'BSIT' => ['BSIT', 'Bachelor of Science in Information Technology'],
            'BSA' => ['BSA', 'Bachelor of Science in Agriculture'],
            'BTLED' => ['BTLED', 'Bachelor of Technology and Livelihood Education'],
        ];
        $expectedProgram = (string) $user->department;
        $nameTokens = $this->nameTokens($name);
        $expectedNameTokens = $this->nameTokens($user->name);
        $checks = [
            'name' => ['expected' => $user->name, 'actual' => $name, 'matches' => $nameTokens !== [] && array_diff($expectedNameTokens, $nameTokens) === []],
            'student_id' => ['expected' => (string) $user->id_number, 'actual' => $id, 'matches' => filled($user->id_number) && $id === $user->id_number],
            'program' => ['expected' => $expectedProgram, 'actual' => $program, 'matches' => $program !== '' && in_array($this->normalize($program), array_map($this->normalize(...), $programNames[$expectedProgram] ?? [$expectedProgram]), true)],
        ];

        return ['message' => 'Only name, ID number, and program are checked. Final approval remains with the ICT Admin.', 'checks' => $checks];
    }

    /**
     * Rebuild reading order from positioned PDF text. A plain text dump lists
     * labels and values in separate blocks, while the COR presents them in
     * two columns on the same line. Grouping by vertical position keeps each
     * label next to its value.
     */
    private function extractText(Document $pdf): string
    {
        $lines = [];

        foreach (array_slice($pdf->getPages(), 0, 2) as $page) {
            $pageLines = [];

            foreach ($page->getDataTm() as $item) {
                $text = trim((string) ($item[1] ?? ''));
                if ($text === '') {
                    continue;
                }

                $x = (float) ($item[0][4] ?? 0);
                $y = (float) ($item[0][5] ?? 0);
                $matchedLine = null;

                foreach ($pageLines as $lineIndex => $line) {
                    if (abs($line['y'] - $y) <= 2.0) {
                        $matchedLine = $lineIndex;
                        break;
                    }
                }

                if ($matchedLine === null) {
                    $pageLines[] = ['y' => $y, 'items' => [['x' => $x, 'text' => $text]]];
                } else {
                    $pageLines[$matchedLine]['items'][] = ['x' => $x, 'text' => $text];
                }
            }

            usort($pageLines, fn (array $a, array $b): int => $b['y'] <=> $a['y']);

            foreach ($pageLines as $line) {
                usort($line['items'], fn (array $a, array $b): int => $a['x'] <=> $b['x']);
                $lines[] = implode(' ', array_column($line['items'], 'text'));
            }

            if ($pageLines === []) {
                $lines[] = $page->getText();
            }
        }

        return implode("\n", $lines);
    }

    private function field(string $text, string $label, string $nextLabels): string
    {
        preg_match('/\b'.$label.'\s*:\s*([^\r\n]+?)(?=\s+(?:'.$nextLabels.')\s*:|[\r\n]|$)/iu', $text, $match);

        return trim($match[1] ?? '');
    }

    private function normalize(string $value): string
    {
        return trim((string) preg_replace('/[^A-Z0-9]+/', ' ', Str::upper(Str::ascii($value))));
    }

    /** @return list<string> */
    private function nameTokens(string $name): array
    {
        $tokens = explode(' ', $this->normalize($name));
        sort($tokens);

        return $tokens;
    }
}
