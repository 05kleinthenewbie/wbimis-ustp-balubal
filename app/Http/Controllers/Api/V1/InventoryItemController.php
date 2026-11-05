<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\AuditLog;
use App\Models\InventoryItem;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryItemController extends ApiController
{
    /**
     * List inventory items.
     */
    public function index(Request $request): JsonResponse
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

        if ($category = $request->input('category')) {
            $query->where('category', $category);
        }

        if ($condition = $request->input('condition')) {
            $query->where('condition', $condition);
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($campus = $request->input('campus')) {
            $query->where(function ($q) use ($campus) {
                $q->where('campus', $campus)
                    ->orWhere('building', $campus)
                    ->orWhere('room', $campus)
                    ->orWhere('specific_location', $campus)
                    ->orWhere('location', 'like', "%{$campus}%");
            });
        }

        if ($endUser = $request->input('end_user')) {
            $query->where('end_user', 'like', "%{$endUser}%");
        }

        return response()->json([
            'data' => $query->get(),
        ]);
    }

    /**
     * Create a new inventory item.
     */
    public function store(Request $request): JsonResponse
    {
        $this->ensureAdmin();

        $item = InventoryItem::create($request->validate($this->rules()));

        AuditLog::record('Added inventory item', 'inventory_items', $item->id);

        return response()->json([
            'message' => 'Inventory item added successfully.',
            'item' => $item,
        ], 201);
    }

    /**
     * Show a single inventory item.
     */
    public function show(string $id): JsonResponse
    {
        $this->ensureAdmin();

        $item = InventoryItem::with([
            'defectiveRecords.jobOrder.serviceRequest.user',
            'incidentReports.reporter',
            'requestItems.serviceRequest.user',
            'auditLogs.adminUser',
        ])->findOrFail($id);

        return response()->json(['item' => $item]);
    }

    /**
     * Update an inventory item.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $this->ensureAdmin();

        $item = InventoryItem::findOrFail($id);

        $rules = $this->rules();
        $rules['property_no'] = ['required', 'string', 'max:50', 'unique:inventory_items,property_no,'.$item->id];

        $item->update($request->validate($rules));

        return response()->json([
            'message' => 'Inventory item updated successfully.',
            'item' => $item->fresh(),
        ]);
    }

    /**
     * Delete an inventory item.
     */
    public function destroy(string $id): JsonResponse
    {
        $this->ensureAdmin();

        $item = InventoryItem::findOrFail($id);
        $itemId = $item->id;
        $item->delete();

        AuditLog::record('Deleted inventory item', 'inventory_items', $itemId);

        return response()->json(['message' => 'Inventory item deleted.']);
    }

    /**
     * Generate the QR code (SVG) for the physical property label.
     */
    public function qr(string $id): JsonResponse
    {
        $this->ensureAdmin();

        $item = InventoryItem::findOrFail($id);

        $renderer = new ImageRenderer(
            new RendererStyle(360, 4),
            new SvgImageBackEnd
        );

        $svg = (new Writer($renderer))->writeString(url('/inventory/'.$item->id));

        return response()->json(['qr' => $svg]);
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
