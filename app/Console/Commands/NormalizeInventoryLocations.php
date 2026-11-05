<?php

namespace App\Console\Commands;

use App\Models\InventoryItem;
use App\Services\InventoryLocationNormalizer;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('inventory:normalize-locations {--dry-run : Show how many records would change without writing}')]
#[Description('Standardize known inventory location variants')]
class NormalizeInventoryLocations extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(InventoryLocationNormalizer $normalizer): int
    {
        $updated = 0;

        foreach (InventoryItem::query()->whereNotNull('location')->lazyById() as $item) {
            $location = $normalizer->normalize($item->location);

            if ($location === $item->location) {
                continue;
            }

            if (! $this->option('dry-run')) {
                $item->update(['location' => $location]);
            }

            $updated++;
        }

        $this->info(($this->option('dry-run') ? 'Would update ' : 'Updated ').$updated.' inventory locations.');

        return self::SUCCESS;
    }
}
