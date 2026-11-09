<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryDocument extends Model
{
    protected $fillable = ['identity_key', 'document_type', 'document_no'];

    /** @return HasMany<InventoryDocumentLine, $this> */
    public function lines(): HasMany
    {
        return $this->hasMany(InventoryDocumentLine::class);
    }
}
