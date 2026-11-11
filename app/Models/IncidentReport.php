<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class IncidentReport extends Model
{
    protected $fillable = [
        'reported_by',
        'item_id',
        'incident_type',
        'incident_description',
        'incident_date',
        'status',
        'resolution_notes',
    ];

    protected $casts = [
        'incident_date' => 'date',
    ];

    /**
     * Get the user who reported this incident.
     */
    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    /**
     * Get the equipment involved, if any.
     */
    public function inventoryItem(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class, 'item_id');
    }

    /**
     * Get liability records resulting from this incident.
     */
    public function userLiabilities(): HasMany
    {
        return $this->hasMany(UserLiability::class, 'incident_id');
    }

    /**
     * Get evidence files uploaded with this incident.
     */
    public function attachments(): HasMany
    {
        return $this->hasMany(IncidentAttachment::class, 'incident_id');
    }
}
