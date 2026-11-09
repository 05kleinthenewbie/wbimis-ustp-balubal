<?php

namespace App\Models;

use App\Concerns\HasNormalizedAttributes;
use Database\Factories\InventoryItemFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class InventoryItem extends Model
{
    /** @use HasFactory<InventoryItemFactory> */
    use HasFactory, HasNormalizedAttributes;

    protected $with = ['documentLine.document', 'currentAssignment.location', 'currentAssignment.custodian.department'];

    protected $hidden = ['documentLine', 'currentAssignment'];

    public const DOCUMENT_FIELDS = ['document_type', 'document_no', 'purchase_order_no', 'fund_cluster', 'supplier', 'unit_of_measure', 'unit_cost', 'total_cost', 'document_quantity'];

    public const LOCATION_FIELDS = ['location', 'campus', 'building', 'room', 'specific_location'];

    public const ASSIGNMENT_FIELDS = ['end_user', 'department', ...self::LOCATION_FIELDS, 'transfer_to'];

    protected function normalizedAttributeNames(): array
    {
        return [...self::DOCUMENT_FIELDS, ...self::ASSIGNMENT_FIELDS];
    }

    protected function readNormalizedAttribute(string $key): mixed
    {
        return match ($key) {
            'document_type', 'document_no' => $this->documentLine?->document?->getAttribute($key),
            'end_user' => $this->currentAssignment?->custodian?->name,
            'department' => $this->currentAssignment?->custodian?->department?->name,
            'transfer_to' => $this->currentAssignment?->transfer_to,
            'location', 'campus', 'building', 'room', 'specific_location' => $this->currentAssignment?->location?->getAttribute($key),
            default => $this->documentLine?->getAttribute($key),
        };
    }

    protected function persistNormalizedAttributes(array $changes): void
    {
        if (array_intersect_key($changes, array_flip(self::DOCUMENT_FIELDS)) !== []) {
            $values = [];
            foreach (self::DOCUMENT_FIELDS as $key) {
                $values[$key] = $this->getAttribute($key);
            }
            $identity = hash('sha256', json_encode(filled($values['document_no'])
                ? [$values['document_type'], $values['document_no']] : ['asset', $this->id], JSON_THROW_ON_ERROR));
            $document = InventoryDocument::firstOrCreate(['identity_key' => $identity], array_intersect_key($values, array_flip(['document_type', 'document_no'])));
            $line = array_diff_key($values, array_flip(['document_type', 'document_no']));
            foreach (['unit_cost', 'total_cost'] as $money) {
                $line[$money] = $line[$money] === null ? null : number_format((float) $line[$money], 2, '.', '');
            }
            $line['document_quantity'] = $line['document_quantity'] === null ? null : (int) $line['document_quantity'];
            $line['source_description'] = $this->description;
            $line['inventory_document_id'] = $document->id;
            ksort($line);
            $sourceKey = hash('sha256', json_encode($line, JSON_THROW_ON_ERROR));
            $record = InventoryDocumentLine::firstOrCreate(['source_key' => $sourceKey], $line);
            $this->newModelQuery()->whereKey($this->id)->update(['inventory_document_line_id' => $record->id]);
            $this->setAttribute('inventory_document_line_id', $record->id);
            $this->unsetRelation('documentLine');
            $this->load('documentLine.document');
        }

        $assignmentChanges = array_intersect_key($changes, array_flip(self::ASSIGNMENT_FIELDS));
        $changed = false;
        foreach ($assignmentChanges as $key => $value) {
            if ($value !== $this->readNormalizedAttribute($key)) {
                $changed = true;
            }
        }
        if ($changed) {
            $locationValues = [];
            foreach (self::LOCATION_FIELDS as $key) {
                $locationValues[$key] = $this->getAttribute($key);
            }
            ksort($locationValues);
            $location = count(array_filter($locationValues, fn ($value) => $value !== null)) > 0
                ? AssetLocation::firstOrCreate(['identity_key' => hash('sha256', json_encode($locationValues, JSON_THROW_ON_ERROR))], $locationValues) : null;
            $department = filled($this->department) ? Department::firstOrCreate(['name' => $this->department]) : null;
            $custodian = $this->end_user !== null || $department !== null
                ? AssetCustodian::firstOrCreate([
                    'identity_key' => hash('sha256', json_encode([$this->end_user, $department?->id], JSON_THROW_ON_ERROR)),
                ], ['name' => $this->end_user, 'department_id' => $department?->id]) : null;
            $this->assignments()->whereNull('ended_at')->update(['ended_at' => now()]);
            $this->assignments()->create([
                'asset_custodian_id' => $custodian?->id, 'asset_location_id' => $location?->id,
                'transfer_to' => $this->transfer_to, 'started_at' => now(),
            ]);
            $this->unsetRelation('currentAssignment');
            $this->load('currentAssignment.location', 'currentAssignment.custodian.department');
        }
    }

    /** @return BelongsTo<InventoryDocumentLine, $this> */
    public function documentLine(): BelongsTo
    {
        return $this->belongsTo(InventoryDocumentLine::class, 'inventory_document_line_id');
    }

    /** @return HasMany<AssetAssignment, $this> */
    public function assignments(): HasMany
    {
        return $this->hasMany(AssetAssignment::class);
    }

    /** @return HasOne<AssetAssignment, $this> */
    public function currentAssignment(): HasOne
    {
        return $this->hasOne(AssetAssignment::class)->whereNull('ended_at')->latestOfMany();
    }

    /**
     * @param  Builder<InventoryItem>  $query
     * @return Builder<InventoryItem>
     */
    public function scopeForDocumentType(Builder $query, string $type): Builder
    {
        return $query->whereHas('documentLine.document', fn (Builder $document) => $document->where('document_type', $type));
    }

    /**
     * @param  Builder<InventoryItem>  $query
     * @return Builder<InventoryItem>
     */
    public function scopeForLocation(Builder $query, string $location): Builder
    {
        return $query->whereHas('currentAssignment.location', function (Builder $query) use ($location): void {
            $query->where(function (Builder $query) use ($location): void {
                foreach (self::LOCATION_FIELDS as $column) {
                    $query->orWhere($column, 'like', '%'.$location.'%');
                }
            });
        });
    }

    /**
     * @param  Builder<InventoryItem>  $query
     * @return Builder<InventoryItem>
     */
    public function scopeForCustodian(Builder $query, string $name): Builder
    {
        return $query->whereHas('currentAssignment.custodian', fn (Builder $custodian) => $custodian->where('name', 'like', '%'.$name.'%'));
    }

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
        'inspection_date' => 'date',
        'sticker_date' => 'date',
    ];

    /**
     * Get all request_items referencing this inventory item.
     *
     * @return HasMany<RequestItem, $this>
     */
    public function requestItems(): HasMany
    {
        return $this->hasMany(RequestItem::class, 'item_id');
    }

    /**
     * Get all defective_equipment records for this item.
     *
     * @return HasMany<DefectiveEquipment, $this>
     */
    public function defectiveRecords(): HasMany
    {
        return $this->hasMany(DefectiveEquipment::class, 'item_id');
    }

    /**
     * Get all incident_reports referencing this item.
     *
     * @return HasMany<IncidentReport, $this>
     */
    public function incidentReports(): HasMany
    {
        return $this->hasMany(IncidentReport::class, 'item_id');
    }

    /**
     * Get the service requests that reference this item.
     *
     * @return BelongsToMany<ServiceRequest, $this>
     */
    public function serviceRequests(): BelongsToMany
    {
        return $this->belongsToMany(ServiceRequest::class, 'request_items', 'item_id', 'request_id');
    }

    /**
     * Get the audit log entries for this inventory record.
     *
     * @return HasMany<AuditLog, $this>
     */
    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class, 'record_id')
            ->where('module_name', 'inventory_items');
    }
}
