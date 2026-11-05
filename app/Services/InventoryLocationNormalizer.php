<?php

namespace App\Services;

class InventoryLocationNormalizer
{
    public function normalize(string $location): string
    {
        $parts = preg_split('/\s+\/\s+|\R+/u', trim($location)) ?: [];

        return implode(' / ', array_map(function (string $part): string {
            $part = trim((string) preg_replace('/\s+/u', ' ', $part));

            return match (mb_strtolower($part)) {
                'comlab', 'computer lab', 'computer laboratory' => 'Computer Laboratory',
                'registrar', 'registrar office' => 'Registrar Office',
                'mpb', 'multipurpose building' => 'Multipurpose Building',
                default => $part,
            };
        }, $parts));
    }
}
