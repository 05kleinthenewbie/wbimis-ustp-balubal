<?php

namespace App\Services;

use App\Models\InventoryItem;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;
use SimpleXMLElement;
use Throwable;
use ZipArchive;

class EquipmentSpreadsheetImporter
{
    private const SPREADSHEET_NAMESPACE = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

    private const RELATIONSHIP_NAMESPACE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

    /**
     * @return array{sheets: array<int, string>, rows: int, units: int, imported: int, skipped: int}
     */
    public function import(string $path, bool $dryRun = false): array
    {
        if (! is_file($path)) {
            throw new RuntimeException("Spreadsheet not found: {$path}");
        }

        $existing = InventoryItem::query()->pluck('property_no')->flip();
        $seen = [];
        $sheets = [];
        $rows = 0;
        $units = 0;
        $imported = 0;
        $skipped = 0;

        DB::beginTransaction();

        try {
            foreach ($this->readWorkbook($path) as $sheet) {
                $header = $this->locateHeader($sheet['rows']);

                if ($header === null) {
                    continue;
                }

                $sheets[] = $sheet['name'];

                foreach ($sheet['rows'] as $index => $cells) {
                    if ($index <= $header['row']) {
                        continue;
                    }

                    $items = $this->buildItems($cells, $header['columns']);

                    if ($items === []) {
                        continue;
                    }

                    $rows++;

                    foreach ($items as $item) {
                        $units++;
                        $property = $item['property_no'];

                        if ($existing->has($property) || isset($seen[$property])) {
                            $skipped++;

                            continue;
                        }

                        $seen[$property] = true;

                        if (! $dryRun) {
                            InventoryItem::query()->create($item);
                        }

                        $imported++;
                    }
                }
            }

            if ($dryRun) {
                DB::rollBack();
            } else {
                DB::commit();
            }
        } catch (Throwable $exception) {
            DB::rollBack();

            throw $exception;
        }

        return [
            'sheets' => $sheets,
            'rows' => $rows,
            'units' => $units,
            'imported' => $imported,
            'skipped' => $skipped,
        ];
    }

    /**
     * @return array<int, array{name: string, rows: array<int, array<string, string>>}>
     */
    private function readWorkbook(string $path): array
    {
        return match (strtolower(pathinfo($path, PATHINFO_EXTENSION))) {
            'xlsx' => $this->readXlsx($path),
            'csv' => [['name' => pathinfo($path, PATHINFO_FILENAME), 'rows' => $this->readCsv($path)]],
            default => throw new RuntimeException('Unsupported file type. Import an .xlsx or .csv file.'),
        };
    }

    /**
     * @return array<int, array{name: string, rows: array<int, array<string, string>>}>
     */
    private function readXlsx(string $path): array
    {
        $zip = new ZipArchive;

        if ($zip->open($path) !== true) {
            throw new RuntimeException('The spreadsheet could not be opened. Save it as .xlsx and try again.');
        }

        try {
            $workbookXml = $zip->getFromName('xl/workbook.xml');
            $relationshipsXml = $zip->getFromName('xl/_rels/workbook.xml.rels');

            if ($workbookXml === false || $relationshipsXml === false) {
                throw new RuntimeException('The workbook is missing required Excel parts.');
            }

            $workbook = $this->parseXml($workbookXml);
            $relationships = $this->parseXml($relationshipsXml);
            $sharedStrings = $this->sharedStrings($zip);
            $relationshipsById = [];

            foreach ($relationships->Relationship as $relationship) {
                $relationshipsById[(string) $relationship->attributes()['Id']] = (string) $relationship->attributes()['Target'];
            }

            $sheets = [];

            foreach ($workbook->children(self::SPREADSHEET_NAMESPACE)->sheets->sheet as $sheet) {
                $relationshipId = (string) $sheet->attributes(self::RELATIONSHIP_NAMESPACE)['id'];
                $target = $relationshipsById[$relationshipId] ?? null;

                if ($target === null) {
                    continue;
                }

                $target = ltrim(str_replace('\\', '/', $target), '/');
                $target = str_starts_with($target, 'xl/') ? $target : 'xl/'.$target;
                $contents = $zip->getFromName($target);

                if ($contents === false) {
                    continue;
                }

                $sheets[] = [
                    'name' => (string) $sheet->attributes()['name'],
                    'rows' => $this->readWorksheet($this->parseXml($contents), $sharedStrings),
                ];
            }

            return $sheets;
        } finally {
            $zip->close();
        }
    }

    /**
     * @return array<int, array<string, string>>
     */
    private function readCsv(string $path): array
    {
        $handle = fopen($path, 'rb');

        if ($handle === false) {
            throw new RuntimeException('The CSV file could not be opened.');
        }

        $rows = [];
        $rowNumber = 0;

        try {
            while (($cells = fgetcsv($handle)) !== false) {
                $rowNumber++;
                $row = [];

                foreach ($cells as $index => $value) {
                    $row[$this->columnLetter($index)] = $this->clean((string) $value);
                }

                $rows[$rowNumber] = $row;
            }
        } finally {
            fclose($handle);
        }

        return $rows;
    }

    /**
     * @param  array<int, string>  $sharedStrings
     * @return array<int, array<string, string>>
     */
    private function readWorksheet(SimpleXMLElement $worksheet, array $sharedStrings): array
    {
        $rows = [];

        foreach ($worksheet->sheetData->row as $row) {
            $rowNumber = (int) $row->attributes()['r'];
            $cells = [];

            foreach ($row->c as $cell) {
                $reference = (string) $cell->attributes()['r'];
                $column = (string) preg_replace('/\d+/', '', $reference);
                $type = (string) $cell->attributes()['t'];

                $cells[$column] = match ($type) {
                    'inlineStr' => $this->inlineString($cell),
                    's' => $sharedStrings[(int) $cell->v] ?? '',
                    default => $this->clean((string) $cell->v),
                };
            }

            $rows[$rowNumber] = $cells;
        }

        /** @var array<int, array<string, string>> $rows */
        return $rows;
    }

    /**
     * @return array<int, string>
     */
    private function sharedStrings(ZipArchive $zip): array
    {
        $contents = $zip->getFromName('xl/sharedStrings.xml');

        if ($contents === false) {
            return [];
        }

        $strings = [];

        foreach ($this->parseXml($contents)->si as $string) {
            $strings[] = $this->stringValue($string);
        }

        return $strings;
    }

    private function stringValue(SimpleXMLElement $element): string
    {
        if (isset($element->t)) {
            return (string) $element->t;
        }

        $text = '';

        foreach ($element->r as $run) {
            if (isset($run->t)) {
                $text .= (string) $run->t;
            }
        }

        return $text;
    }

    private function inlineString(SimpleXMLElement $cell): string
    {
        if (! isset($cell->is)) {
            return '';
        }

        return $this->clean($this->stringValue($cell->is));
    }

    private function parseXml(string $contents): SimpleXMLElement
    {
        $previous = libxml_use_internal_errors(true);
        $xml = simplexml_load_string($contents, SimpleXMLElement::class, LIBXML_NONET | LIBXML_COMPACT);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        if ($xml === false) {
            throw new RuntimeException('An Excel part could not be parsed. Re-save the spreadsheet and try again.');
        }

        return $xml;
    }

    /**
     * @param  array<int, array<string, string>>  $rows
     * @return array{row: int, columns: array<string, string>}|null
     */
    private function locateHeader(array $rows): ?array
    {
        foreach ($rows as $index => $cells) {
            $normalized = array_map($this->normalizeHeader(...), $cells);

            if (in_array('DESCRIPTION', $normalized, true) && in_array('QTY', $normalized, true)) {
                return ['row' => $index, 'columns' => $this->mapColumns($cells)];
            }
        }

        return null;
    }

    /**
     * @param  array<string, string>  $cells
     * @return array<string, string>
     */
    private function mapColumns(array $cells): array
    {
        $columns = [];

        foreach ($cells as $column => $value) {
            $key = match ($this->normalizeHeader($value)) {
                'DESCRIPTION' => 'description',
                'QTY', 'QUANTITY' => 'qty',
                'PRICE', 'UNITCOST' => 'price',
                'PROPERTYNUMBERINVENTORYITEMNO', 'PROPERTYNUMBER', 'INVENTORYITEMNO' => 'property',
                'SERIALNUMBER', 'SERIALNO' => 'serial',
                'PO', 'PONO', 'PURCHASEORDERNO' => 'po',
                'ENDUSER' => 'end_user',
                'DATEACQUIRED' => 'acquired',
                'LOCATION' => 'location',
                'ITEMNOTFOUND', 'CONDITION' => 'condition',
                'REMARKS' => 'remarks',
                'ICSNO', 'PARNO' => 'document_no',
                default => null,
            };

            if ($key !== null) {
                $columns[$key] = $column;
            }
        }

        return $columns;
    }

    /**
     * @param  array<string, string>  $cells
     * @param  array<string, string>  $columns
     * @return array<int, array<string, mixed>>
     */
    private function buildItems(array $cells, array $columns): array
    {
        $value = function (string $key) use ($cells, $columns): string {
            $column = $columns[$key] ?? null;

            return $column === null ? '' : $this->clean($cells[$column] ?? '');
        };

        $description = $value('description');

        if ($description === '' || $this->normalizeHeader($description) === 'DESCRIPTION') {
            return [];
        }

        $properties = $this->splitValues($value('property'));
        $serials = $this->splitValues($value('serial'));

        if ($properties === []) {
            return [];
        }

        $name = $this->itemName($description);
        [$brand, $model] = $this->brandAndModel($description);
        $category = $this->category($name, $description);
        $condition = $this->condition($value('condition'));
        $location = $this->inline($value('location'), ' / ');
        $endUser = $this->inline($value('end_user'));
        $purchaseOrder = $this->inline($value('po'));
        $remarks = $value('remarks');
        $purchaseDate = $this->excelDate($value('acquired'));
        $unitCost = $this->money($value('price'));
        $specification = $this->specification($description);

        $items = [];

        foreach ($properties as $index => $property) {
            $property = Str::limit($property, 50, '');
            $serial = $this->serial($serials[$index] ?? '');
            $items[] = [
                'property_no' => $property,
                'item_inventory_no' => $property,
                'item_name' => Str::limit($name, 150, ''),
                'category' => $category,
                'brand' => $brand === null ? null : Str::limit($brand, 100, ''),
                'model' => $model === null ? null : Str::limit($model, 100, ''),
                'serial_no' => $serial,
                'specification' => $specification,
                'description' => $description,
                'location' => $location === '' ? null : Str::limit($location, 150, ''),
                'campus' => 'Balubal Campus',
                'condition' => $condition,
                'status' => 'active',
                'purchase_date' => $purchaseDate,
                'unit_cost' => $unitCost,
                'purchase_order_no' => $purchaseOrder === '' ? null : Str::limit($purchaseOrder, 150, ''),
                'end_user' => $endUser === '' ? null : Str::limit($endUser, 150, ''),
                'inspection_remarks' => $remarks === '' ? null : $remarks,
            ];
        }

        return $items;
    }

    /**
     * @return array<int, string>
     */
    private function splitValues(string $value, string $pattern = '/(?:\R+|\s+\/\s+)/'): array
    {
        if ($value === '') {
            return [];
        }

        return array_values(array_filter(
            array_map('trim', preg_split($pattern, $value) ?: []),
            fn (string $part): bool => $part !== '',
        ));
    }

    private function itemName(string $description): string
    {
        $text = $this->clean((string) preg_replace('/\s+/u', ' ', $description));
        $length = mb_strlen($text);
        $markers = [' (New', '(New', ' (Offer', '(Offer', '/ Offer', ' Offer:', 'Offer:', ' | ', ' Brand:', 'Brand:', ' Specifications:', 'Specifications:'];

        foreach ($markers as $marker) {
            $position = mb_stripos($text, $marker);

            if ($position !== false && $position < $length) {
                $length = $position;
            }
        }

        if ($length === mb_strlen($text)) {
            $position = mb_stripos($text, ' / ');

            if ($position !== false) {
                $length = $position;
            }
        }

        $name = trim(mb_substr($text, 0, $length), " \t\n\r\0\x0B,;/-");

        return $name !== '' ? $name : 'Imported inventory item';
    }

    /**
     * @return array{0: ?string, 1: ?string}
     */
    private function brandAndModel(string $description): array
    {
        $brand = null;
        $model = null;

        if (preg_match('/\bBrand\b\s*[:\-]?\s*(.*?)(?=\s*\bModel\b\s*[:\-]|\s*Specifications?\b|\s*\/|\R|$)/iu', $description, $matches) === 1) {
            $brand = $this->nullable($matches[1]);
        }

        if (preg_match('/\bModel\b\s*[:\-]?\s*(.*?)(?=\s*Specifications?\b|\s*\/|\R|$)/iu', $description, $matches) === 1) {
            $model = $this->nullable($matches[1]);
        }

        if ($brand !== null && $this->normalizeHeader($brand) === 'MODEL') {
            $brand = null;
        }

        return [$brand, $model];
    }

    private function nullable(string $value): ?string
    {
        $value = $this->clean($value);
        $value = (string) preg_replace('/^[^\p{L}\p{N}]+/u', '', $value);
        $value = trim($value, " \t\n\r\0\x0B:-");
        $value = (string) preg_replace('/\s+/u', ' ', $value);

        return $value === '' ? null : $value;
    }

    private function inline(string $value, string $separator = ', '): string
    {
        $value = (string) preg_replace('/\R+/u', $separator, $value);
        $value = (string) preg_replace('/[ \t]+/u', ' ', $value);

        return trim($value);
    }

    private function specification(string $description): ?string
    {
        if (preg_match('/Specifications?\s*:?\s*(.+)$/isu', $description, $matches) !== 1) {
            return null;
        }

        $specification = $this->clean($matches[1]);

        return $specification === '' ? null : $specification;
    }

    private function category(string $name, string $description): ?string
    {
        $nameHaystack = Str::upper($name);
        $haystack = Str::upper($name.' '.$description);

        return match (true) {
            Str::contains($nameHaystack, ['LAPTOP', 'NOTEBOOK', 'MACBOOK', 'THINKPAD', 'IDEAPAD', 'VIVOBOOK']) => 'Laptops',
            Str::contains($haystack, ['LAPTOP', 'NOTEBOOK', 'MACBOOK', 'THINKPAD', 'IDEAPAD', 'VIVOBOOK']) => 'Laptops',
            Str::contains($nameHaystack, ['PRINTER', 'PHOTOCOPIER', 'DUPLICATOR', 'SCANNER']) => 'Printers',
            Str::contains($haystack, ['PRINTER', 'PHOTOCOPIER', 'DUPLICATOR', 'SCANNER', 'PRINT, COPY']) => 'Printers',
            Str::contains($haystack, ['PROJECTOR']) => 'Projectors',
            Str::contains($nameHaystack, ['UPS', 'AVR', 'UNINTERRUPTIBLE']) => 'UPS Devices',
            Str::contains($haystack, ['ROUTER', 'SWITCH', 'ACCESS POINT', 'CCTV', 'NVR', 'MIKROTIK', 'REYEE', 'TP-LINK', 'D-LINK', 'NETWORK CABINET', 'NETWORK CAMERA']) => 'Network Devices',
            Str::contains($haystack, ['DESKTOP', 'PERSONAL COMPUTER', 'PC SET', 'SYSTEM UNIT', 'SERVER', 'MONITOR']) => 'Desktop Computers',
            Str::contains($haystack, ['TABLET', 'PAD']) => 'Laptops',
            default => null,
        };
    }

    private function condition(string $value): string
    {
        $normalized = Str::upper($value);

        return match (true) {
            Str::contains($normalized, ['NON SERVICEABLE', 'NON-SERVICEABLE', 'NOT SERVICEABLE', 'DEFECTIVE']) => 'defective',
            Str::contains($normalized, ['UNDER REPAIR', 'UNDER-REPAIR', 'REPAIR']) => 'under_repair',
            default => 'working',
        };
    }

    private function excelDate(string $value): ?string
    {
        if ($value === '' || $value === '-') {
            return null;
        }

        if (is_numeric($value)) {
            $serial = (int) floor((float) $value);

            if ($serial > 0) {
                return CarbonImmutable::create(1899, 12, 30)->addDays($serial)->toDateString();
            }
        }

        try {
            return CarbonImmutable::parse($value)->toDateString();
        } catch (Throwable) {
            return null;
        }
    }

    private function money(string $value): ?float
    {
        if ($value === '' || $value === '-') {
            return null;
        }

        $number = (string) preg_replace('/[^0-9.\-]/', '', $value);

        return is_numeric($number) ? (float) $number : null;
    }

    private function serial(string $value): ?string
    {
        $value = $this->clean($value);
        $value = (string) preg_replace('/^S\/N\s*:?\s*/i', '', $value);
        $value = trim($value, " \t\n\r\0\x0B/");

        if ($value === '' || $value === '-' || in_array(Str::upper($value), ['N/A', 'NA', 'NONE'], true)) {
            return null;
        }

        return Str::limit($value, 100, '');
    }

    private function normalizeHeader(string $value): string
    {
        return (string) preg_replace('/[^A-Z0-9]/', '', Str::upper($this->clean($value)));
    }

    private function clean(string $value): string
    {
        $value = str_replace("\u{00A0}", ' ', $value);
        $cleaned = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', $value);

        return trim($cleaned ?? $value);
    }

    private function columnLetter(int $index): string
    {
        $letter = '';

        for ($index++; $index > 0; $index = intdiv($index - 1, 26)) {
            $letter = chr(65 + ($index - 1) % 26).$letter;
        }

        return $letter;
    }
}
