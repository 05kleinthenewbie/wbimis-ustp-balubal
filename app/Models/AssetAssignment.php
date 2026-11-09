<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetAssignment extends Model
{
    protected $fillable = ['asset_custodian_id', 'asset_location_id', 'transfer_to', 'started_at', 'ended_at'];

    protected function casts(): array
    {
        return ['started_at' => 'datetime', 'ended_at' => 'datetime'];
    }

    /** @return BelongsTo<InventoryItem, $this> */
    public function item(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class, 'inventory_item_id');
    }

    /** @return BelongsTo<AssetCustodian, $this> */
    public function custodian(): BelongsTo
    {
        return $this->belongsTo(AssetCustodian::class, 'asset_custodian_id');
    }

    /** @return BelongsTo<AssetLocation, $this> */
    public function location(): BelongsTo
    {
        return $this->belongsTo(AssetLocation::class, 'asset_location_id');
    }
}
