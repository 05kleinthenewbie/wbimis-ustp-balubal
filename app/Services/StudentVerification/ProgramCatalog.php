<?php

namespace App\Services\StudentVerification;

final class ProgramCatalog
{
    /** @param array<string, array{name: string, aliases?: list<string>}> $programs */
    public function __construct(private array $programs) {}

    /** @return list<string> */
    public function codes(): array
    {
        return array_keys($this->programs);
    }

    public function fullName(string $code): ?string
    {
        return $this->programs[strtoupper($code)]['name'] ?? null;
    }

    public function normalize(?string $value): ?string
    {
        $normalize = fn (string $text): string => trim(preg_replace('/\s+/', ' ', preg_replace('/[^a-z0-9 ]/', ' ', strtolower($text))));
        $needle = $normalize($value ?? '');
        if ($needle === '') {
            return null;
        }
        foreach ($this->programs as $code => $program) {
            foreach ([$code, $program['name'], ...($program['aliases'] ?? [])] as $alias) {
                if ($normalize($alias) === $needle) {
                    return $code;
                }
            }
        }

        return null;
    }
}
