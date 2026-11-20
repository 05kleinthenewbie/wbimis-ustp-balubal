<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Facility;
use App\Models\IncidentReport;
use App\Models\InventoryItem;
use App\Models\JobOrder;
use App\Models\Role;
use App\Models\ServiceRequest;
use App\Models\User;
use App\Models\UserLiability;
use App\Services\SlaService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ReportController extends Controller
{
    private function ensureAdmin(): void
    {
        if (Auth::user()->role->role_name !== 'ict_admin') {
            abort(403, 'Only ICT Admins can view reports.');
        }
    }

    public function index()
    {
        $this->ensureAdmin();

        return Inertia::render('reports/index', [
            'overview' => [
                'facility_bookings' => Booking::count(),
                'service_requests' => ServiceRequest::count(),
                'job_orders' => JobOrder::count(),
                'completed_job_orders' => JobOrder::whereIn('status', ['completed', 'closed'])->count(),
            ],
            'monthlyActivity' => $this->monthlyActivity(),
            'requestStats' => [
                'total' => ServiceRequest::count(),
                'by_status' => ServiceRequest::selectRaw('request_status, count(*) as total')
                    ->groupBy('request_status')
                    ->pluck('total', 'request_status'),
            ],
            'jobOrderStats' => [
                'total' => JobOrder::count(),
                'by_status' => JobOrder::selectRaw('status, count(*) as total')
                    ->groupBy('status')
                    ->pluck('total', 'status'),
                'average_rating' => round((float) JobOrder::whereNotNull('rating')->avg('rating'), 1),
                'rated_count' => JobOrder::whereNotNull('rating')->count(),
            ],
            'slaMetrics' => SlaService::getMetrics(),
            'inventoryStats' => array_merge([
                'total' => InventoryItem::count(),
                'by_condition' => InventoryItem::selectRaw('`condition`, count(*) as total')
                    ->groupBy('condition')
                    ->pluck('total', 'condition'),
                'by_status' => $this->inventoryByStatus(),
            ], $this->serviceLifeMetrics()),
            'bookingStats' => [
                'total' => Booking::count(),
                'by_status' => Booking::selectRaw('booking_status, count(*) as total')
                    ->groupBy('booking_status')
                    ->pluck('total', 'booking_status'),
            ],
            'facilityUtilization' => $this->facilityUtilization(),
            'incidentStats' => [
                'total' => IncidentReport::count(),
                'by_status' => IncidentReport::selectRaw('status, count(*) as total')
                    ->groupBy('status')
                    ->pluck('total', 'status'),
                'by_type' => IncidentReport::selectRaw('incident_type, count(*) as total')
                    ->groupBy('incident_type')
                    ->pluck('total', 'incident_type'),
                'liabilities_assigned' => UserLiability::count(),
                'liabilities_settled' => UserLiability::where('liability_status', 'settled')->count(),
            ],
            'userStats' => [
                'total' => User::count(),
                'by_role' => Role::withCount('users')->get()->pluck('users_count', 'role_name'),
                'active' => User::where('status', 'active')->count(),
                'inactive' => User::where('status', 'inactive')->count(),
                'pending_approvals' => User::where('approval_status', 'pending')->count(),
            ],
            'auditStats' => [
                'total' => AuditLog::count(),
                'by_module' => AuditLog::selectRaw('module_name, count(*) as total')
                    ->groupBy('module_name')
                    ->pluck('total', 'module_name'),
                'last_seven_days' => AuditLog::where('action_date', '>=', now()->subDays(7))->count(),
            ],
        ]);
    }

    /**
     * Export the report summary as a CSV file.
     */
    public function export()
    {
        $this->ensureAdmin();

        $rows = [
            ['Module', 'Metric', 'Value'],
        ];

        $appendBreakdown = function (string $module, string $metric, $counts) use (&$rows) {
            $rows[] = [$module, $metric.' (total)', (string) array_sum(is_array($counts) ? $counts : $counts->all())];

            foreach ($counts as $key => $count) {
                $rows[] = [$module, $metric.' - '.$key, (string) $count];
            }
        };

        $appendBreakdown('Service Requests', 'By status', ServiceRequest::selectRaw('request_status, count(*) as total')
            ->groupBy('request_status')
            ->pluck('total', 'request_status'));

        $appendBreakdown('Job Orders', 'By status', JobOrder::selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status'));

        $rows[] = ['Job Orders', 'Average rating', (string) round((float) JobOrder::whereNotNull('rating')->avg('rating'), 1)];
        $rows[] = ['Job Orders', 'Rated count', (string) JobOrder::whereNotNull('rating')->count()];

        $appendBreakdown('Inventory', 'By condition', InventoryItem::selectRaw('`condition`, count(*) as total')
            ->groupBy('condition')
            ->pluck('total', 'condition'));

        $appendBreakdown('Inventory', 'By status', $this->inventoryByStatus());

        $serviceLife = $this->serviceLifeMetrics();
        $rows[] = ['Inventory', 'Past service life', (string) $serviceLife['past_service_life']];
        $rows[] = ['Inventory', 'Expiring in 30 days', (string) $serviceLife['expiring_soon']];

        $appendBreakdown('Bookings', 'By status', Booking::selectRaw('booking_status, count(*) as total')
            ->groupBy('booking_status')
            ->pluck('total', 'booking_status'));

        foreach ($this->facilityUtilization() as $facility) {
            $rows[] = ['Facility Utilization', $facility['facility_name'].' - Total bookings', (string) $facility['total']];
            $rows[] = ['Facility Utilization', $facility['facility_name'].' - Pending', (string) $facility['by_status']['pending']];
            $rows[] = ['Facility Utilization', $facility['facility_name'].' - Approved', (string) $facility['by_status']['approved']];
            $rows[] = ['Facility Utilization', $facility['facility_name'].' - Rejected', (string) $facility['by_status']['rejected']];
            $rows[] = ['Facility Utilization', $facility['facility_name'].' - Cancelled', (string) $facility['by_status']['cancelled']];
            $rows[] = ['Facility Utilization', $facility['facility_name'].' - Approved hours', (string) $facility['approved_hours']];
        }

        $appendBreakdown('Incidents', 'By status', IncidentReport::selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status'));

        $appendBreakdown('Incidents', 'By type', IncidentReport::selectRaw('incident_type, count(*) as total')
            ->groupBy('incident_type')
            ->pluck('total', 'incident_type'));

        $rows[] = ['Liabilities', 'Assigned', (string) UserLiability::count()];
        $rows[] = ['Liabilities', 'Settled', (string) UserLiability::where('liability_status', 'settled')->count()];
        $rows[] = ['Liabilities', 'Waived', (string) UserLiability::where('liability_status', 'waived')->count()];
        $rows[] = ['Liabilities', 'Pending', (string) UserLiability::where('liability_status', 'pending')->count()];

        $appendBreakdown('User Accounts', 'By role', Role::withCount('users')->get()->pluck('users_count', 'role_name'));
        $rows[] = ['User Accounts', 'Total', (string) User::count()];
        $rows[] = ['User Accounts', 'Active', (string) User::where('status', 'active')->count()];
        $rows[] = ['User Accounts', 'Inactive', (string) User::where('status', 'inactive')->count()];
        $rows[] = ['User Accounts', 'Pending approvals', (string) User::where('approval_status', 'pending')->count()];

        $appendBreakdown('Audit Log', 'By module', AuditLog::selectRaw('module_name, count(*) as total')
            ->groupBy('module_name')
            ->pluck('total', 'module_name'));
        $rows[] = ['Audit Log', 'Total actions', (string) AuditLog::count()];
        $rows[] = ['Audit Log', 'Last 7 days', (string) AuditLog::where('action_date', '>=', now()->subDays(7))->count()];

        return response()->streamDownload(function () use ($rows) {
            $handle = fopen('php://output', 'w');
            fwrite($handle, "\xEF\xBB\xBF");
            foreach ($rows as $row) {
                fputcsv($handle, $row, ',', '"', '\\');
            }
            fclose($handle);
        }, 'ict-reports-'.now()->format('Ymd-His').'.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * Activity totals for the last six months.
     *
     * @return array<int, array{month: string, bookings: int, service_requests: int, job_orders: int}>
     */
    private function monthlyActivity(): array
    {
        $start = Carbon::now()->subMonths(5)->startOfMonth();

        $countByMonth = fn (Collection $dates): Collection => $dates
            ->countBy(fn (string $date): string => Carbon::parse($date)->format('Y-m'));

        $bookings = $countByMonth(
            Booking::where('booking_date', '>=', $start)->pluck('booking_date')->map(fn ($date) => (string) $date)
        );

        $requests = $countByMonth(
            ServiceRequest::where('date_requested', '>=', $start)->pluck('date_requested')->map(fn ($date) => (string) $date)
        );

        $jobOrders = $countByMonth(
            JobOrder::where('created_at', '>=', $start)->pluck('created_at')->map(fn ($date) => (string) $date)
        );

        return collect(range(5, 0))
            ->map(function (int $monthsAgo) use ($bookings, $requests, $jobOrders): array {
                $month = Carbon::now()->subMonths($monthsAgo);
                $key = $month->format('Y-m');

                return [
                    'month' => $month->format('M'),
                    'bookings' => (int) ($bookings[$key] ?? 0),
                    'service_requests' => (int) ($requests[$key] ?? 0),
                    'job_orders' => (int) ($jobOrders[$key] ?? 0),
                ];
            })
            ->all();
    }

    /**
     * Inventory item counts grouped by lifecycle status.
     *
     * @return Collection<int|string, int>
     */
    private function inventoryByStatus()
    {
        return InventoryItem::selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');
    }

    /**
     * Counts of items still in service whose service life has ended or ends soon.
     *
     * @return array{past_service_life: int, expiring_soon: int}
     */
    private function serviceLifeMetrics(): array
    {
        $inService = InventoryItem::whereIn('status', ['active', 'for_disposal']);

        return [
            'past_service_life' => (clone $inService)
                ->whereNotNull('expiration_date')
                ->whereDate('expiration_date', '<', today())
                ->count(),
            'expiring_soon' => (clone $inService)
                ->whereNotNull('expiration_date')
                ->whereDate('expiration_date', '>=', today())
                ->whereDate('expiration_date', '<=', today()->addDays(30))
                ->count(),
        ];
    }

    /**
     * Per-facility reservation counts and approved booked hours.
     *
     * @return array<int, array<string, mixed>>
     */
    private function facilityUtilization(): array
    {
        return Facility::withCount('bookings')
            ->orderBy('facility_name')
            ->get()
            ->map(function (Facility $facility) {
                $byStatus = $facility->bookings()
                    ->selectRaw('booking_status, count(*) as total')
                    ->groupBy('booking_status')
                    ->pluck('total', 'booking_status');

                $approvedMinutes = $facility->bookings()
                    ->where('booking_status', 'approved')
                    ->get()
                    ->sum(function (Booking $booking) {
                        $start = ((int) substr((string) $booking->start_time, 0, 2)) * 60
                            + (int) substr((string) $booking->start_time, 3, 2);
                        $end = ((int) substr((string) $booking->end_time, 0, 2)) * 60
                            + (int) substr((string) $booking->end_time, 3, 2);

                        return max(0, $end - $start);
                    });

                return [
                    'id' => $facility->id,
                    'facility_name' => $facility->facility_name,
                    'facility_type' => $facility->facility_type,
                    'capacity' => $facility->capacity,
                    'location' => $facility->location,
                    'availability_status' => $facility->availability_status,
                    'total' => (int) $facility->bookings_count,
                    'by_status' => [
                        'pending' => (int) ($byStatus['pending'] ?? 0),
                        'approved' => (int) ($byStatus['approved'] ?? 0),
                        'rejected' => (int) ($byStatus['rejected'] ?? 0),
                        'cancelled' => (int) ($byStatus['cancelled'] ?? 0),
                    ],
                    'approved_hours' => round($approvedMinutes / 60, 1),
                ];
            })
            ->values()
            ->all();
    }
}
