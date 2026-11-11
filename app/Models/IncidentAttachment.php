<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A file uploaded as evidence for a laboratory incident report.
 *
 * @property int $id
 * @property int $incident_id
 * @property string $file_name
 * @property string $file_path
 * @property CarbonInterface|null $uploaded_at
 */
class IncidentAttachment extends Model
{
    protected $fillable = ['incident_id', 'file_name', 'file_path', 'uploaded_at'];

    protected $casts = [
        'uploaded_at' => 'datetime',
    ];

    /** @return BelongsTo<IncidentReport, $this> */
    public function incident(): BelongsTo
    {
        return $this->belongsTo(IncidentReport::class, 'incident_id');
    }
}
