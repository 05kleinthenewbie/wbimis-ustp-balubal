<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $targets = [
            'job-orders' => 'job_orders',
            'requests' => 'service_requests',
            'bookings' => 'bookings',
            'incidents' => 'incident_reports',
            'inventory' => 'inventory_items',
        ];

        DB::table('notifications')
            ->whereNotNull('link')
            ->orderBy('id')
            ->chunkById(200, function ($notifications) use ($targets): void {
                foreach ($notifications as $notification) {
                    $link = (string) $notification->link;

                    foreach ($targets as $prefix => $table) {
                        if (preg_match('#^/'.$prefix.'/(\d+)#', $link, $matches) !== 1) {
                            continue;
                        }

                        if (! DB::table($table)->where('id', (int) $matches[1])->exists()) {
                            DB::table('notifications')->where('id', $notification->id)->update(['link' => null]);
                        }

                        break;
                    }
                }
            });
    }

    public function down(): void
    {
        //
    }
};
