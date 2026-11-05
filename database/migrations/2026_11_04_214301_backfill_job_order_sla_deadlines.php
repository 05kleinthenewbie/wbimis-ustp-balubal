<?php

use Carbon\Carbon;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('job_orders')
            ->whereIn('status', ['open', 'in_progress'])
            ->whereNotNull('date_assigned')
            ->whereNull('sla_deadline')
            ->orderBy('id')
            ->chunkById(100, function ($orders): void {
                foreach ($orders as $jobOrder) {
                    $priority = $jobOrder->priority_level
                        ?? DB::table('service_requests')->where('id', $jobOrder->request_id)->value('priority_level')
                        ?? 'medium';

                    $hours = match ($priority) {
                        'urgent' => 24,
                        'high' => 48,
                        'medium' => 72,
                        'low' => 120,
                        default => 72,
                    };

                    $deadline = Carbon::parse($jobOrder->date_assigned)->addHours($hours);
                    $hoursUntilDeadline = Carbon::now()->diffInHours($deadline, false);

                    DB::table('job_orders')->where('id', $jobOrder->id)->update([
                        'sla_deadline' => $deadline,
                        'sla_status' => match (true) {
                            $hoursUntilDeadline < 0 => 'breached',
                            $hoursUntilDeadline < 6 => 'at_risk',
                            default => 'on_track',
                        },
                    ]);
                }
            });
    }

    public function down(): void
    {
        //
    }
};
