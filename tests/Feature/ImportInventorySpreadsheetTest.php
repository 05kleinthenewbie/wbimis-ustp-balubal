<?php

use App\Models\InventoryItem;
use App\Services\EquipmentSpreadsheetImporter;

/**
 * @param  array<int, array{name: string, rows: array<int, array<int, string>>}>  $sheets
 */
function invWorkbook(array $sheets): string
{
    $path = tempnam(sys_get_temp_dir(), 'inv').'.xlsx';
    $zip = new ZipArchive;
    $zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE);

    $shared = [];
    $sheetEntries = '';
    $relationshipEntries = '';

    foreach (array_values($sheets) as $index => $sheet) {
        $id = $index + 1;
        $sheetEntries .= sprintf(
            '<sheet name="%s" sheetId="%d" r:id="rId%d"/>',
            htmlspecialchars($sheet['name'], ENT_XML1),
            $id,
            $id,
        );
        $relationshipEntries .= sprintf(
            '<Relationship Id="rId%d" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet%d.xml"/>',
            $id,
            $id,
        );
        $zip->addFromString("xl/worksheets/sheet{$id}.xml", invWorksheet($sheet['rows'], $shared));
    }

    $zip->addFromString('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8"?>'
        .'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        .'<sheets>'.$sheetEntries.'</sheets></workbook>');
    $zip->addFromString('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8"?>'
        .'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        .$relationshipEntries.'</Relationships>');
    $zip->addFromString('xl/sharedStrings.xml', invSharedStrings($shared));
    $zip->close();

    return $path;
}

/**
 * @param  array<int, array<int, string>>  $rows
 * @param  array<int, string>  $shared
 */
function invWorksheet(array $rows, array &$shared): string
{
    $xml = '<?xml version="1.0" encoding="UTF-8"?>'
        .'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>';

    foreach (array_values($rows) as $rowIndex => $row) {
        $xml .= '<row r="'.($rowIndex + 1).'">';

        foreach (array_values($row) as $columnIndex => $value) {
            $value = (string) $value;
            $reference = invColumn($columnIndex).($rowIndex + 1);

            if ($value === '') {
                continue;
            }

            if (preg_match('/^-?\d+(?:\.\d+)?$/', $value) === 1) {
                $xml .= '<c r="'.$reference.'"><v>'.$value.'</v></c>';

                continue;
            }

            $sharedIndex = array_search($value, $shared, true);

            if ($sharedIndex === false) {
                $shared[] = $value;
                $sharedIndex = array_key_last($shared);
            }

            $xml .= '<c r="'.$reference.'" t="s"><v>'.$sharedIndex.'</v></c>';
        }

        $xml .= '</row>';
    }

    return $xml.'</sheetData></worksheet>';
}

/**
 * @param  array<int, string>  $shared
 */
function invSharedStrings(array $shared): string
{
    $xml = '<?xml version="1.0" encoding="UTF-8"?>'
        .'<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="'.count($shared).'" uniqueCount="'.count($shared).'">';

    foreach ($shared as $value) {
        $xml .= '<si><t xml:space="preserve">'.htmlspecialchars($value, ENT_XML1).'</t></si>';
    }

    return $xml.'</sst>';
}

function invColumn(int $index): string
{
    $letter = '';

    for ($index++; $index > 0; $index = intdiv($index - 1, 26)) {
        $letter = chr(65 + ($index - 1) % 26).$letter;
    }

    return $letter;
}

/**
 * @param  array<int, array<int, string>>  $rows
 */
function invCsv(array $rows): string
{
    $path = tempnam(sys_get_temp_dir(), 'inv').'.csv';
    $handle = fopen($path, 'wb');

    foreach ($rows as $row) {
        fputcsv($handle, $row);
    }

    fclose($handle);

    return $path;
}

function invHeader(): array
{
    return [
        'DESCRIPTION',
        'QTY',
        'PRICE',
        "PROPERTY NUMBER/\nINVENTORY ITEM NO.",
        'SERIAL NUMBER',
        'PO #',
        'END USER',
        'DATE ACQUIRED',
        'LOCATION',
        'ITEM NOT FOUND',
        'REMARKS',
    ];
}

test('imports equipment rows, expands quantities, and maps inventory fields', function () {
    $path = invWorkbook([[
        'name' => 'ICS',
        'rows' => [
            invHeader(),
            [
                'Branded Laptop / Brand: Lenovo Model: ThinkPad E14 / Specifications: 16GB RAM, 512GB SSD',
                '2', '50000', "P-100\nP-101", "S-1\nS-2", 'PO-9', 'Jane Doe', '44197', 'Faculty Office', 'SERVICEABLE', 'ok',
            ],
            [
                'Epson Printer (New) / Brand: Epson Model: L5590',
                '1', '15000', 'P-102', 'S/N: ABC/K4', 'PO-10', 'John Roe', '-', 'Library', 'NON SERVICEABLE', 'Power issue',
            ],
            [
                'Router / Brand: Reyee Model: RG-EW1200',
                '2', '2500', 'P-103 / P-104', 'S-7 / S-8', '', '', '', 'Storeroom', 'SERVICEABLE', '',
            ],
        ],
    ]]);

    try {
        $result = app(EquipmentSpreadsheetImporter::class)->import($path);
    } finally {
        @unlink($path);
    }

    expect($result)->toBe(['sheets' => ['ICS'], 'rows' => 3, 'units' => 5, 'imported' => 5, 'skipped' => 0])
        ->and(InventoryItem::query()->count())->toBe(5);

    $laptop = InventoryItem::query()->where('property_no', 'P-100')->sole();
    expect($laptop->item_name)->toBe('Branded Laptop')
        ->and($laptop->brand)->toBe('Lenovo')
        ->and($laptop->model)->toBe('ThinkPad E14')
        ->and($laptop->category)->toBe('Laptops')
        ->and($laptop->serial_no)->toBe('S-1')
        ->and($laptop->location)->toBe('Faculty Office')
        ->and($laptop->end_user)->toBe('Jane Doe')
        ->and($laptop->purchase_order_no)->toBe('PO-9')
        ->and($laptop->campus)->toBe('Balubal Campus')
        ->and($laptop->condition)->toBe('working')
        ->and($laptop->purchase_date?->toDateString())->toBe('2021-01-01')
        ->and((float) $laptop->unit_cost)->toBe(50000.0)
        ->and($laptop->specification)->toBe('16GB RAM, 512GB SSD');

    expect(InventoryItem::query()->where('property_no', 'P-101')->sole()->serial_no)->toBe('S-2');

    expect(InventoryItem::query()->where('property_no', 'P-104')->sole()->serial_no)->toBe('S-8');

    $printer = InventoryItem::query()->where('property_no', 'P-102')->sole();
    expect($printer->item_name)->toBe('Epson Printer')
        ->and($printer->category)->toBe('Printers')
        ->and($printer->condition)->toBe('defective')
        ->and($printer->serial_no)->toBe('ABC/K4')
        ->and($printer->purchase_date)->toBeNull()
        ->and($printer->inspection_remarks)->toBe('Power issue');
});

test('cleans messy descriptions without explicit field separators', function () {
    $path = invWorkbook([[
        'name' => 'ICS',
        'rows' => [
            invHeader(),
            [
                "LAPTOP\nOffer: LENOVO IDEAPAD 3 141 TL6\nLaptop/Intel core i5-1135G7",
                '1', '40000', 'P-500', 'S-9', '', '', '', '', 'SERVICEABLE', '',
            ],
            [
                "Mikrotik Hex RB750GR3 (New)\nBrand:\nModel:\nSpecifications: 5x gigabit ethernet",
                '1', '4995', 'P-501', 'S-10', '', '', '', '', 'SERVICEABLE', '',
            ],
            [
                "RYZEN 7 5700G B450M GIGABYTE PC SET (New)\nSpecifications: RYZEN 7 5700G PROCESSOR\nAVR",
                '1', '37650', 'P-502', 'S-11', '', '', '', '', 'SERVICEABLE', '',
            ],
            [
                "BRANDED LAPTOP\nBrand: - ASUS VIVOBOOK\nModel: - 16X X1605VA",
                '1', '81420', 'P-503', 'S-12', '', '', '', "Faculty Office\nNTP Office", 'SERVICEABLE', '',
            ],
        ],
    ]]);

    try {
        $result = app(EquipmentSpreadsheetImporter::class)->import($path);
    } finally {
        @unlink($path);
    }

    expect($result['imported'])->toBe(4);

    $laptop = InventoryItem::query()->where('property_no', 'P-500')->sole();
    expect($laptop->item_name)->toBe('LAPTOP')
        ->and($laptop->brand)->toBeNull()
        ->and($laptop->model)->toBeNull();

    $router = InventoryItem::query()->where('property_no', 'P-501')->sole();
    expect($router->item_name)->toBe('Mikrotik Hex RB750GR3')
        ->and($router->brand)->toBeNull()
        ->and($router->model)->toBeNull()
        ->and($router->category)->toBe('Network Devices');

    $desktop = InventoryItem::query()->where('property_no', 'P-502')->sole();
    expect($desktop->category)->toBe('Desktop Computers');

    $branded = InventoryItem::query()->where('property_no', 'P-503')->sole();
    expect($branded->brand)->toBe('ASUS VIVOBOOK')
        ->and($branded->model)->toBe('16X X1605VA')
        ->and($branded->location)->toBe('Faculty Office / NTP Office');
});

test('skips existing property numbers and duplicates in the same file', function () {
    InventoryItem::factory()->create(['property_no' => 'P-100']);

    $path = invWorkbook([[
        'name' => 'ICS',
        'rows' => [
            invHeader(),
            ['Laptop / Brand: Lenovo Model: E14', '1', '40000', 'P-100', 'S-1', '', '', '', '', 'SERVICEABLE', ''],
            ['Laptop / Brand: Lenovo Model: E14', '1', '40000', 'P-101', 'S-2', '', '', '', '', 'SERVICEABLE', ''],
            ['Laptop / Brand: Lenovo Model: E14', '1', '40000', 'P-101', 'S-3', '', '', '', '', 'SERVICEABLE', ''],
        ],
    ]]);

    try {
        $result = app(EquipmentSpreadsheetImporter::class)->import($path);
    } finally {
        @unlink($path);
    }

    expect($result['imported'])->toBe(1)
        ->and($result['skipped'])->toBe(2)
        ->and(InventoryItem::query()->count())->toBe(2)
        ->and(InventoryItem::query()->where('property_no', 'P-101')->sole()->serial_no)->toBe('S-2');
});

test('a dry run reports what would be imported without writing records', function () {
    $path = invWorkbook([[
        'name' => 'PAR',
        'rows' => [
            ['PROPERTY ACKNOWLEDGEMENT RECEIPT'],
            invHeader(),
            ['Desktop Computer / Brand: Acer Model: Veriton', '1', '30000', 'P-200', 'S-4', '', '', '', '', 'SERVICEABLE', ''],
        ],
    ]]);

    try {
        $result = app(EquipmentSpreadsheetImporter::class)->import($path, dryRun: true);
    } finally {
        @unlink($path);
    }

    expect($result['imported'])->toBe(1)
        ->and($result['sheets'])->toBe(['PAR'])
        ->and(InventoryItem::query()->count())->toBe(0);
});

test('imports a csv export using the same column mapping', function () {
    $path = invCsv([
        ['DESCRIPTION', 'QTY', 'PRICE', 'PROPERTY NUMBER/INVENTORY ITEM NO.', 'SERIAL NUMBER', 'DATE ACQUIRED', 'LOCATION', 'CONDITION'],
        ['Network Switch / Brand: TP-Link Model: TL-SG3210', '1', '8975', 'P-300', 'S-5', '44197', 'Computer Lab', 'SERVICEABLE'],
    ]);

    try {
        $result = app(EquipmentSpreadsheetImporter::class)->import($path);
    } finally {
        @unlink($path);
    }

    expect($result['imported'])->toBe(1);

    $switch = InventoryItem::query()->where('property_no', 'P-300')->sole();
    expect($switch->item_name)->toBe('Network Switch')
        ->and($switch->category)->toBe('Network Devices')
        ->and($switch->purchase_date?->toDateString())->toBe('2021-01-01');
});

test('ignores sheets without a description header', function () {
    $path = invWorkbook([
        ['name' => 'Cover', 'rows' => [['ICT RELATED EQUIPMENT'], ['Prepared by: ICT Office']]],
        ['name' => 'ICS', 'rows' => [invHeader(), ['Laptop / Brand: HP Model: ProBook', '1', '45000', 'P-400', 'S-6', '', '', '', '', 'SERVICEABLE', '']]],
    ]);

    try {
        $result = app(EquipmentSpreadsheetImporter::class)->import($path);
    } finally {
        @unlink($path);
    }

    expect($result['sheets'])->toBe(['ICS'])
        ->and($result['imported'])->toBe(1);
});

test('rejects unsupported file types', function () {
    $path = tempnam(sys_get_temp_dir(), 'inv').'.txt';
    file_put_contents($path, 'not a spreadsheet');

    try {
        app(EquipmentSpreadsheetImporter::class)->import($path);
    } finally {
        @unlink($path);
    }
})->throws(RuntimeException::class, 'Unsupported file type');
