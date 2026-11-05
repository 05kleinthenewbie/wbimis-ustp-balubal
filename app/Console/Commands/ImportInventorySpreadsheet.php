<?php

namespace App\Console\Commands;

use App\Services\EquipmentSpreadsheetImporter;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use RuntimeException;
use Throwable;

#[Signature('inventory:import {file : Path to an .xlsx or .csv ICS/PAR equipment sheet} {--dry-run : Parse and count rows without writing to the database} {--update-existing : Update matching property numbers from the spreadsheet}')]
#[Description('Import ICT equipment rows from an ICS/PAR spreadsheet into the inventory')]
class ImportInventorySpreadsheet extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(EquipmentSpreadsheetImporter $importer): int
    {
        $path = (string) $this->argument('file');
        $dryRun = (bool) $this->option('dry-run');
        $updateExisting = (bool) $this->option('update-existing');

        if (! is_file($path)) {
            $this->error("File not found: {$path}");

            return self::FAILURE;
        }

        try {
            $result = $importer->import($path, $dryRun, $updateExisting);
        } catch (RuntimeException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        } catch (Throwable $exception) {
            report($exception);
            $this->error('The import failed. Check the application log for details.');

            return self::FAILURE;
        }

        $headers = ['Sheets', 'Rows', 'Units', 'Imported', 'Skipped'];
        $row = [
            $result['sheets'] === [] ? 'No printable sheets found' : implode(', ', $result['sheets']),
            $result['rows'],
            $result['units'],
            $result['imported'],
            $result['skipped'],
        ];

        if ($updateExisting) {
            $headers[] = 'Updated';
            $row[] = $result['updated'];
        }

        $this->table($headers, [$row]);

        if ($dryRun) {
            $this->warn('Dry run only — no inventory records were written.');
        } else {
            $this->info('Import complete.');
        }

        return self::SUCCESS;
    }
}
