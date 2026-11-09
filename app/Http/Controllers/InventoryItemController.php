<?php

namespace App\Http\Controllers;

use App\Models\AssetCustodian;
use App\Models\AssetLocation;
use App\Models\AuditLog;
use App\Models\InventoryItem;
use App\Models\User;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class InventoryItemController extends Controller
{
    /**
     * Ensure only ICT Admins can manage inventory.
     */
    private function ensureAdmin(): void
    {
        if (Auth::user()->role->role_name !== 'ict_admin') {
            abort(403, 'Only ICT Admins can manage inventory.');
        }
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $this->ensureAdmin();

        $query = InventoryItem::query()->latest('purchase_date')->latest('id');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('item_name', 'like', "%{$search}%")
                    ->orWhere('property_no', 'like', "%{$search}%")
                    ->orWhere('serial_no', 'like', "%{$search}%")
                    ->orWhere('brand', 'like', "%{$search}%")
                    ->orWhere('model', 'like', "%{$search}%");
            });
        }

        $documentType = $request->input('document_type');

        if (in_array($documentType, ['ICS', 'PAR'], true)) {
            $query->forDocumentType($documentType);
        } else {
            $documentType = 'all';
        }

        if ($category = $request->input('category')) {
            $storedAliases = [
                'Desktop Computers' => [
                    'Desktop Computers',
                    'Desktop',
                    'Server',
                    'Other',
                    'Monitor',
                    'Hardware',
                    'ICT Peripherals',
                ],
                'Laptops' => ['Laptops', 'Laptop'],
                'Printers' => ['Printers', 'Printer'],
                'Projectors' => ['Projectors', 'Projector'],
                'Network Devices' => [
                    'Network Devices',
                    'Network',
                    'Network Equipment',
                ],
                'UPS Devices' => ['UPS Devices', 'UPS'],
                'Batteries' => ['Batteries', 'Battery'],
                'SSL/TLS Certificates' => [
                    'SSL/TLS Certificates',
                    'SSL Certificate',
                ],
            ];

            $query->whereIn('category', $storedAliases[$category] ?? [$category]);
        }

        if ($condition = $request->input('condition')) {
            $query->where('condition', $condition);
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($campus = $request->input('campus')) {
            $query->forLocation($campus);
        }

        if ($endUser = $request->input('end_user')) {
            $query->forCustodian($endUser);
        }

        $items = $query->get();

        $conditionCounts = InventoryItem::query()
            ->selectRaw('`condition`, count(*) as total')
            ->groupBy('condition')
            ->pluck('total', 'condition');

        $statusCounts = InventoryItem::query()
            ->selectRaw('`status`, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $options = [
            'categories' => collect(InventoryItem::CATEGORY_GROUPS)
                ->flatten()
                ->merge(
                    InventoryItem::whereNotNull('category')
                        ->distinct()
                        ->pluck('category')
                        ->reject(fn (string $category): bool => in_array($category, [
                            'Printer Ink', 'Toner Cartridges', 'Thermal Paste', 'Cleaning Supplies',
                            'Batteries', 'Battery', 'Antivirus Licenses', 'Software Subscriptions',
                            'SSL/TLS Certificates', 'SSL Certificate',
                        ], true)),
                )
                ->unique()
                ->sort()
                ->values(),
            'campuses' => AssetLocation::whereNotNull('location')
                ->distinct()
                ->pluck('location')
                ->sort()
                ->values(),
            'endUsers' => AssetCustodian::whereNotNull('name')
                ->distinct()
                ->pluck('name')
                ->sort()
                ->values(),
        ];

        return Inertia::render('inventory/index', [
            'items' => $items,
            'filters' => [...$request->only(['search', 'category', 'condition', 'status', 'campus', 'end_user']), 'document_type' => $documentType],
            'stats' => [
                'total' => (int) array_sum($conditionCounts->all() ?: [0]),
                'working' => (int) ($conditionCounts['working'] ?? 0),
                'defective' => (int) ($conditionCounts['defective'] ?? 0),
                'under_repair' => (int) ($conditionCounts['under_repair'] ?? 0),
                'active' => (int) ($statusCounts['active'] ?? 0),
                'for_disposal' => (int) ($statusCounts['for_disposal'] ?? 0),
                'retired' => (int) ($statusCounts['retired'] ?? 0),
                'disposed' => (int) ($statusCounts['disposed'] ?? 0),
            ],
            'options' => $options,
        ]);
    }

    /**
     * Inventory list preset to defective items.
     */
    public function defective(Request $request)
    {
        $request->merge(['condition' => 'defective']);

        return $this->index($request);
    }

    /**
     * Inventory list preset to items under repair.
     */
    public function underRepair(Request $request)
    {
        $request->merge(['condition' => 'under_repair']);

        return $this->index($request);
    }

    /**
     * Expiration monitoring dashboard (expiring soon / expired / all tracked).
     */
    public function expirations()
    {
        $this->ensureAdmin();

        $items = InventoryItem::query()
            ->whereNotNull('expiration_date')
            ->orderBy('expiration_date')
            ->get([
                'id',
                'property_no',
                'item_name',
                'category',
                'brand',
                'model',
                'status',
                'condition',
                'purchase_date',
                'expiration_date',
                'expiration_type',
            ]);

        return Inertia::render('inventory/expirations', [
            'items' => $items,
            'categoryGroups' => InventoryItem::CATEGORY_GROUPS,
            'expirationTypes' => InventoryItem::EXPIRATION_TYPES,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $this->ensureAdmin();

        return Inertia::render('inventory/create', [
            'users' => User::where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name']),
            'categoryGroups' => InventoryItem::CATEGORY_GROUPS,
            'expirationTypes' => InventoryItem::EXPIRATION_TYPES,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $this->ensureAdmin();

        $validated = $request->validate($this->rules());

        $item = InventoryItem::create($validated);

        AuditLog::record('Added inventory item', 'inventory_items', $item->id);

        return redirect()->route('inventory.index')
            ->with('status', 'Inventory item added successfully.');
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $this->ensureAdmin();

        $item = InventoryItem::with([
            'defectiveRecords.jobOrder.serviceRequest.user',
            'incidentReports.reporter',
            'requestItems.serviceRequest.user',
            'auditLogs.adminUser',
        ])->findOrFail($id);

        return Inertia::render('inventory/show', ['item' => $item]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        $this->ensureAdmin();

        return Inertia::render('inventory/edit', [
            'item' => InventoryItem::findOrFail($id),
            'users' => User::where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name']),
            'categoryGroups' => InventoryItem::CATEGORY_GROUPS,
            'expirationTypes' => InventoryItem::EXPIRATION_TYPES,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $this->ensureAdmin();

        $item = InventoryItem::findOrFail($id);

        $rules = $this->rules();
        $rules['property_no'] = ['required', 'string', 'max:50', 'unique:inventory_items,property_no,'.$item->id];

        $original = $item->only(array_keys($rules));

        $item->update($request->validate($rules));

        AuditLog::record(
            'Updated inventory item',
            'inventory_items',
            $item->id,
            null,
            $original,
            $item->only(array_keys($rules)),
        );

        return redirect()->route('inventory.index')
            ->with('status', 'Inventory item updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $this->ensureAdmin();

        $item = InventoryItem::findOrFail($id);
        $itemId = $item->id;
        $item->delete();

        AuditLog::record('Deleted inventory item', 'inventory_items', $itemId);

        return redirect()->route('inventory.index')
            ->with('status', 'Inventory item deleted.');
    }

    /**
     * Mark an item for disposal (typically after reaching its service life).
     */
    public function markDisposal(string $id)
    {
        $this->ensureAdmin();

        $item = InventoryItem::findOrFail($id);

        $previousStatus = $item->status;

        $item->update(['status' => 'for_disposal']);

        AuditLog::record(
            'Marked item for disposal',
            'inventory_items',
            $item->id,
            null,
            ['status' => $previousStatus],
            ['status' => $item->status],
        );

        return redirect()->back()
            ->with('status', 'Item marked for disposal.');
    }

    /**
     * Flag an inventory item as defective and create a defect record.
     */
    public function flagDefective(Request $request, string $id)
    {
        $this->ensureAdmin();

        $item = InventoryItem::findOrFail($id);

        $validated = $request->validate([
            'damage_description' => ['required', 'string', 'max:1000'],
            'job_order_id' => ['nullable', 'exists:job_orders,id'],
        ]);

        $item->defectiveRecords()->create([
            ...$validated,
            'repair_status' => 'pending',
            'date_reported' => now(),
        ]);

        $previousCondition = $item->condition;

        $item->update(['condition' => 'defective']);

        AuditLog::record(
            'Flagged item as defective',
            'inventory_items',
            $item->id,
            $validated['damage_description'],
            ['condition' => $previousCondition],
            ['condition' => 'defective'],
        );

        return redirect()->back()
            ->with('status', 'Item flagged as defective. A defect record was created.');
    }

    /**
     * Update the repair status of a defect record.
     */
    public function updateRepairStatus(Request $request, string $id, string $defectiveId)
    {
        $this->ensureAdmin();

        $item = InventoryItem::findOrFail($id);
        $record = $item->defectiveRecords()->findOrFail($defectiveId);

        $validated = $request->validate([
            'repair_status' => ['required', 'in:pending,in_progress,completed'],
        ]);

        $previousRepairStatus = $record->repair_status;
        $previousCondition = $item->condition;

        $record->update($validated);

        if ($validated['repair_status'] === 'completed') {
            $item->update(['condition' => 'working']);
        }

        AuditLog::record(
            'Repair status changed to '.$validated['repair_status'],
            'inventory_items',
            $item->id,
            null,
            ['repair_status' => $previousRepairStatus, 'condition' => $previousCondition],
            ['repair_status' => $record->repair_status, 'condition' => $item->condition],
        );

        return redirect()->back()
            ->with('status', 'Repair status updated successfully.');
    }

    /**
     * Generate the QR code for the physical property label.
     * The QR content identifies the record via its canonical URL, and
     * the database remains the source of truth for all fields.
     */
    public function qr(string $id)
    {
        $this->ensureAdmin();

        $item = InventoryItem::findOrFail($id);

        $renderer = new ImageRenderer(
            new RendererStyle(360, 4),
            new SvgImageBackEnd
        );

        $content = url('/inventory/'.$item->id);
        $svg = (new Writer($renderer))->writeString($content);

        return response($svg, 200, [
            'Content-Type' => 'image/svg+xml',
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    /**
     * Shared validation rules for inventory records.
     *
     * @return array<string, array<int, string>>
     */
    private function rules(): array
    {
        return [
            'property_no' => ['required', 'string', 'max:50', 'unique:inventory_items,property_no'],
            'item_inventory_no' => ['nullable', 'string', 'max:50'],
            'item_name' => ['required', 'string', 'max:150'],
            'category' => ['nullable', 'string', 'max:50'],
            'brand' => ['nullable', 'string', 'max:100'],
            'model' => ['nullable', 'string', 'max:100'],
            'serial_no' => ['nullable', 'string', 'max:100'],
            'specification' => ['nullable', 'string'],
            'description' => ['nullable', 'string'],
            'location' => ['nullable', 'string', 'max:150'],
            'purchase_date' => ['nullable', 'date'],
            'expiration_date' => ['nullable', 'date'],
            'warranty_details' => ['nullable', 'string', 'max:255'],
            'acquisition_year' => ['nullable', 'integer', 'min:1900', 'max:2100'],
            'fund_cluster' => ['nullable', 'string', 'max:100'],
            'document_no' => ['nullable', 'string', 'max:100'],
            'unit_of_measure' => ['nullable', 'string', 'max:30'],
            'total_cost' => ['nullable', 'numeric', 'min:0', 'max:9999999999'],
            'sticker_date' => ['nullable', 'date'],
            'supplier' => ['nullable', 'string', 'max:150'],
            'transfer_to' => ['nullable', 'string', 'max:150'],
            'shelf_life' => ['nullable', 'string', 'max:50'],
            'document_quantity' => ['nullable', 'integer', 'min:1', 'max:10000'],
            'document_type' => ['nullable', 'in:ICS,PAR'],
            'expiration_type' => [
                'nullable',
                'string',
                'max:50',
                'in:'.implode(',', InventoryItem::EXPIRATION_TYPES),
            ],
            'unit_cost' => ['nullable', 'numeric', 'min:0', 'max:9999999999'],
            'purchase_order_no' => ['nullable', 'string', 'max:150'],
            'end_user' => ['nullable', 'string', 'max:150'],
            'department' => ['nullable', 'string', 'max:100'],
            'campus' => ['nullable', 'string', 'max:100'],
            'building' => ['nullable', 'string', 'max:100'],
            'room' => ['nullable', 'string', 'max:100'],
            'specific_location' => ['nullable', 'string', 'max:150'],
            'condition' => ['required', 'in:working,defective,under_repair'],
            'status' => ['required', 'in:active,for_disposal,retired,disposed'],
            'validation' => ['nullable', 'string', 'max:50'],
            'inspection_date' => ['nullable', 'date'],
            'inspection_remarks' => ['nullable', 'string'],
        ];
    }
}
