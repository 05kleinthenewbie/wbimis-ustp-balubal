<?php

namespace App\Services\StudentVerification;

final class NameNormalizer
{
    public static function clean(string $name): string
    {
        return trim(preg_replace('/\s+/u', ' ', preg_replace('/[^\p{L}\p{N} ]/u', ' ', mb_strtoupper($name))));
    }

    public static function compare(?string $left, ?string $right): string
    {
        if (blank($left) || blank($right)) {
            return 'review';
        }

        $normalize = function (string $name): array {
            if (str_contains($name, ',')) {
                [$surname, $given] = explode(',', $name, 2);
                $name = $given.' '.$surname;
            }

            return explode(' ', self::clean($name));
        };
        $a = $normalize($left);
        $b = $normalize($right);
        if ($a === $b) {
            return 'match';
        }

        if (count($a) !== count($b) || count($a) < 2) {
            return 'review';
        }

        foreach ($a as $index => $token) {
            if ($token === $b[$index]) {
                continue;
            }
            // Only an interior middle initial may stand for a full middle name.
            if ($index > 0 && $index < count($a) - 1 && (mb_strlen($token) === 1 || mb_strlen($b[$index]) === 1) && mb_substr($token, 0, 1) === mb_substr($b[$index], 0, 1)) {
                continue;
            }

            return 'mismatch';
        }

        return 'match';
    }
}
