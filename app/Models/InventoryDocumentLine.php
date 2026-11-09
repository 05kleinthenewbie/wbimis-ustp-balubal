<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryDocumentLine extends Model
{
    protected $fillable = ['inventory_document_id', 'source_key', 'source_description', 'purchase_order_no', 'fund_cluster', 'supplier', 'unit_of_measure', 'unit_cost', 'total_cost', 'document_quantity'];

    protected function casts(): array
    {
        return ['unit_cost' => 'decimal:2', 'total_cost' => 'decimal:2', 'document_quantity' => 'integer'];
    }

    /** @return BelongsTo<InventoryDocument, $this> */
    public function document(): BelongsTo
    {
        return $this->belongsTo(InventoryDocument::class, 'inventory_document_id');
    }

    /** @return HasMany<InventoryItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(InventoryItem::class);
    }
}
