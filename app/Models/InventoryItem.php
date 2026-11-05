<?php

namespace App\Models;

use Database\Factories\InventoryItemFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryItem extends Model
{
    /** @use HasFactory<InventoryItemFactory> */
    use HasFactory;

    /**
     * Recommended inventory taxonomy grouped by record family.
     *
     * @var array<string, array<int, string>>
     */
    public const CATEGORY_GROUPS = [
        'ICT Equipment' => [
            'Desktop Computers',
            'Laptops',
            'Printers',
            'Projectors',
            'Network Devices',
            'UPS Devices',
        ],
    ];

    /**
     * Expiration meanings used to interpret the expiration date field.
     *
     * @var array<int, string>
     */
    public const EXPIRATION_TYPES = [
        'Expiration Date',
        'Shelf Life',
    ];

    protected $fillable = [
        'property_no',
        'item_inventory_no',
        'item_name',
        'category',
        'brand',
        'model',
        'serial_no',
        'specification',
        'description',
        'location',
        'purchase_date',
        'expiration_date',
        'expiration_type',
        'warranty_details',
        'unit_cost',
        'purchase_order_no',
        'end_user',
        'department',
        'campus',
        'building',
        'room',
        'specific_location',
        'condition',
        'status',
        'validation',
        'inspection_date',
        'inspection_remarks',
        'acquisition_year',
        'fund_cluster',
        'document_no',
        'unit_of_measure',
        'total_cost',
        'sticker_date',
        'supplier',
        'transfer_to',
        'shelf_life',
        'document_quantity',
        'document_type',
    ];

    protected $casts = [
        'purchase_date' => 'date',
        'expiration_date' => 'date',
        'unit_cost' => 'decimal:2',
        'inspection_date' => 'date',
        'sticker_date' => 'date',
        'total_cost' => 'decimal:2',
    ];

    /**
     * Get all request_items referencing this inventory item.
     */
    public function requestItems(): HasMany
    {
        return $this->hasMany(RequestItem::class, 'item_id');
    }

    /**
     * Get all defective_equipment records for this item.
     */
    public function defectiveRecords(): HasMany
    {
        return $this->hasMany(DefectiveEquipment::class, 'item_id');
    }

    /**
     * Get all incident_reports referencing this item.
     */
    public function incidentReports(): HasMany
    {
        return $this->hasMany(IncidentReport::class, 'item_id');
    }

    /**
     * Get the service requests that reference this item.
     */
    public function serviceRequests(): BelongsToMany
    {
        return $this->belongsToMany(ServiceRequest::class, 'request_items', 'item_id', 'request_id');
    }

    /**
     * Get the audit log entries for this inventory record.
     */
    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class, 'record_id')
            ->where('module_name', 'inventory_items');
    }
}
