<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\IncidentReport;
use App\Models\InventoryItem;
use App\Models\JobOrder;
use App\Models\ServiceRequest;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user()->loadMissing('role');

        $isAdmin = $user->role->role_name === 'ict_admin';
        $isStudent = $user->role->role_name === 'student';

        $period = $request->query('period');

        if (! in_array($period, ['month', 'year'], true)) {
            $period = 'month';
        }

        $periodRange = match ($period) {
            'month' => [now()->subDays(29)->startOfDay(), now()->endOfDay()],
            default => [now()->subDays(364)->startOfDay(), now()->endOfDay()],
        };

        $requestCounts = $this->summarizeStatuses(
            ServiceRequest::query()->when(! $isAdmin, fn ($query) => $query->where('user_id', $user->id)),
            'request_status', ['pending', 'approved', 'completed', 'rejected'], $periodRange,
        );
        $incidentCounts = $this->summarizeStatuses(
            IncidentReport::query()->when(! $isAdmin, fn ($query) => $query->where('reported_by', $user->id)),
            'status', ['open', 'under_review'], $periodRange,
        );
        $bookingCounts = $isStudent ? [] : $this->summarizeStatuses(
            Booking::query()->when(! $isAdmin, fn ($query) => $query->where('user_id', $user->id)),
            'booking_status', ['pending'], $periodRange,
        );

        if ($isAdmin) {
            $jobOrderCounts = array_map('intval', (array) JobOrder::query()->toBase()
                ->selectRaw('COALESCE(SUM(CASE WHEN created_at BETWEEN ? AND ? THEN 1 ELSE 0 END), 0) as period_total', $periodRange)
                ->selectRaw("COALESCE(SUM(CASE WHEN status IN ('open', 'in_progress') THEN 1 ELSE 0 END), 0) as active")
                ->selectRaw("COALESCE(SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END), 0) as in_progress")
                ->selectRaw('COALESCE(SUM(CASE WHEN assigned_to IS NULL THEN 1 ELSE 0 END), 0) as unassigned')
                ->selectRaw("COALESCE(SUM(CASE WHEN status IN ('open', 'in_progress') AND sla_deadline < ? THEN 1 ELSE 0 END), 0) as overdue", [now()])
                ->first());
            $inventoryCounts = array_map('intval', (array) InventoryItem::query()->toBase()
                ->selectRaw('COUNT(*) as total')
                ->selectRaw("COALESCE(SUM(CASE WHEN `condition` = 'working' THEN 1 ELSE 0 END), 0) as working")
                ->selectRaw("COALESCE(SUM(CASE WHEN `condition` = 'defective' THEN 1 ELSE 0 END), 0) as defective")
                ->selectRaw("COALESCE(SUM(CASE WHEN `condition` = 'under_repair' THEN 1 ELSE 0 END), 0) as under_repair")
                ->selectRaw('COALESCE(SUM(CASE WHEN expiration_date BETWEEN ? AND ? THEN 1 ELSE 0 END), 0) as expiring', [now()->startOfDay(), now()->addDays(30)->endOfDay()])
                ->selectRaw('COALESCE(SUM(CASE WHEN expiration_date < ? THEN 1 ELSE 0 END), 0) as expired', [now()->startOfDay()])
                ->first());

            $stats = [
                'pendingRequests' => $requestCounts['pending'],
                'openJobOrders' => $jobOrderCounts['active'],
                'pendingBookings' => $bookingCounts['pending'],
                'openIncidents' => $incidentCounts['open'] + $incidentCounts['under_review'],
                'technicians' => User::whereHas('role', fn ($query) => $query->where('role_name', 'ict_admin'))->count(),
                'unassignedJobOrders' => $jobOrderCounts['unassigned'],
                'overdueJobOrders' => $jobOrderCounts['overdue'],
                'inventoryExpiryAlerts' => $inventoryCounts['expired'] + $inventoryCounts['expiring'],
            ];

            $inventorySummary = [
                'working' => $inventoryCounts['working'],
                'defective' => $inventoryCounts['defective'],
                'under_repair' => $inventoryCounts['under_repair'],
            ];

            $overview = [
                'serviceRequests' => [
                    'total' => $requestCounts['period_total'],
                    'pending' => $requestCounts['pending'],
                ],
                'jobOrders' => [
                    'total' => $jobOrderCounts['period_total'],
                    'inProgress' => $jobOrderCounts['in_progress'],
                    'unassigned' => $stats['unassignedJobOrders'],
                ],
                'inventory' => [
                    'total' => $inventoryCounts['total'],
                    'defective' => $inventorySummary['defective'],
                ],
                'bookings' => [
                    'total' => $bookingCounts['period_total'],
                    'pending' => $stats['pendingBookings'],
                ],
                'incidents' => [
                    'total' => $incidentCounts['period_total'],
                    'unresolved' => $stats['openIncidents'],
                ],
            ];

            $pendingActions = [
                'bookingApprovals' => $stats['pendingBookings'],
                'requestApprovals' => $stats['pendingRequests'],
                'jobOrdersInProgress' => $jobOrderCounts['in_progress'],
                'overdueJobOrders' => $stats['overdueJobOrders'],
                'incidentsUnresolved' => $stats['openIncidents'],
            ];

            $overview['pendingActions'] = ['total' => array_sum($pendingActions)];

            $inventoryAlerts = [
                'expiringSoon' => $inventoryCounts['expiring'],
                'expired' => $inventoryCounts['expired'],
                'defective' => $inventorySummary['defective'],
                'underRepair' => $inventorySummary['under_repair'],
            ];

            $activitySeries = $this->buildActivitySeries($period, [
                'requests' => ServiceRequest::query(),
                'bookings' => Booking::query(),
                'jobOrders' => JobOrder::query(),
            ]);

            $recentRequests = ServiceRequest::with('user:id,name')
                ->select(['id', 'user_id', 'priority_level', 'request_status', 'problem_description', 'date_requested'])
                ->latest()
                ->take(5)
                ->get()
                ->map(fn (ServiceRequest $r) => [
                    'id' => $r->id,
                    'user_name' => $r->user?->name ?? 'Deleted User',
                    'priority' => $r->priority_level,
                    'status' => $r->request_status,
                    'description' => mb_substr($r->problem_description, 0, 80),
                    'date' => $r->date_requested?->toIso8601String(),
                ]);

            $recentJobOrders = JobOrder::with('technician:id,name')
                ->select(['id', 'assigned_to', 'status', 'date_assigned'])
                ->latest()
                ->take(5)
                ->get()
                ->map(fn (JobOrder $jo) => [
                    'id' => $jo->id,
                    'technician_name' => $jo->technician?->name ?? 'Unassigned',
                    'status' => $jo->status,
                    'date_assigned' => $jo->date_assigned?->toIso8601String(),
                ]);

            $recentIncidents = IncidentReport::with('reporter:id,name')
                ->select(['id', 'reported_by', 'incident_type', 'status', 'incident_date'])
                ->latest()
                ->take(5)
                ->get()
                ->map(fn (IncidentReport $i) => [
                    'id' => $i->id,
                    'reporter_name' => $i->reporter?->name ?? 'Deleted User',
                    'type' => $i->incident_type,
                    'status' => $i->status,
                    'date' => $i->incident_date?->toIso8601String(),
                ]);

            $recentBookings = Booking::with(['user:id,name', 'facility:id,facility_name'])
                ->select(['id', 'user_id', 'facility_id', 'booking_status', 'booking_date'])
                ->latest()
                ->take(5)
                ->get()
                ->map(fn (Booking $b) => [
                    'id' => $b->id,
                    'user_name' => $b->user?->name ?? 'Deleted User',
                    'facility' => $b->facility?->facility_name ?? 'Unknown Facility',
                    'status' => $b->booking_status,
                    'date' => $b->booking_date,
                ]);
        } else {
            $stats = [
                'myRequests' => $requestCounts['total'],
                'pendingRequests' => $requestCounts['pending'],
            ];

            $approvedRequests = $requestCounts['approved'];
            $completedRequests = $requestCounts['completed'];
            $rejectedRequests = $requestCounts['rejected'];

            $overview = [
                'serviceRequests' => [
                    'total' => $requestCounts['period_total'],
                    'pending' => $stats['pendingRequests'],
                    'approved' => $approvedRequests,
                    'completed' => $completedRequests,
                ],
            ];

            $pendingActions = [
                'requestApprovals' => $stats['pendingRequests'],
                'rejectedRequests' => $rejectedRequests,
            ];

            $activitySources = [
                'requests' => ServiceRequest::where('user_id', $user->id),
            ];

            $unresolvedIncidents = $incidentCounts['open'] + $incidentCounts['under_review'];
            $overview['incidents'] = [
                'total' => $incidentCounts['period_total'],
                'unresolved' => $unresolvedIncidents,
            ];
            $pendingActions['incidentsUnresolved'] = $unresolvedIncidents;
            $activitySources['incidents'] = IncidentReport::where('reported_by', $user->id);

            if (! $isStudent) {
                $pendingBookings = $bookingCounts['pending'];

                $overview['bookings'] = [
                    'total' => $bookingCounts['period_total'],
                    'pending' => $pendingBookings,
                ];

                $pendingActions['bookingApprovals'] = $pendingBookings;

                $activitySources['bookings'] = Booking::where('user_id', $user->id);
            }

            $overview['pendingActions'] = ['total' => array_sum($pendingActions)];

            $inventoryAlerts = null;
            $activitySeries = $isStudent
                ? null
                : $this->buildActivitySeries($period, $activitySources);

            $recentRequests = ServiceRequest::where('user_id', $user->id)
                ->select(['id', 'priority_level', 'request_status', 'problem_description', 'date_requested'])
                ->latest()
                ->take(5)
                ->get()
                ->map(fn (ServiceRequest $r) => [
                    'id' => $r->id,
                    'user_name' => $user->name,
                    'priority' => $r->priority_level,
                    'status' => $r->request_status,
                    'description' => mb_substr($r->problem_description, 0, 80),
                    'date' => $r->date_requested?->toIso8601String(),
                ]);

            $recentJobOrders = [];
            $recentIncidents = IncidentReport::where('reported_by', $user->id)
                ->select(['id', 'incident_type', 'status', 'incident_date'])
                ->latest()->take(5)->get()
                ->map(fn (IncidentReport $incident) => [
                    'id' => $incident->id,
                    'reporter_name' => $user->name,
                    'type' => $incident->incident_type,
                    'status' => $incident->status,
                    'date' => $incident->incident_date?->toIso8601String(),
                ]);
            $recentBookings = [];
        }

        return Inertia::render('dashboard', [
            'stats' => $stats,
            'isAdmin' => $isAdmin,
            'period' => $period,
            'overview' => $overview,
            'pendingActions' => $pendingActions,
            'inventoryAlerts' => $inventoryAlerts,
            'activitySeries' => $activitySeries,
            'recentRequests' => $recentRequests ?? collect(),
            'recentJobOrders' => $recentJobOrders ?? collect(),
            'recentIncidents' => $recentIncidents ?? collect(),
            'recentBookings' => $recentBookings ?? collect(),
        ]);
    }

    /**
     * @param  list<string>  $statuses
     * @param  array{CarbonInterface, CarbonInterface}  $periodRange
     * @return array<string, int>
     */
    private function summarizeStatuses(EloquentBuilder $query, string $statusColumn, array $statuses, array $periodRange): array
    {
        $summary = $query->toBase()->selectRaw('COUNT(*) as total')
            ->selectRaw('COALESCE(SUM(CASE WHEN created_at BETWEEN ? AND ? THEN 1 ELSE 0 END), 0) as period_total', $periodRange);
        $column = $summary->getGrammar()->wrap($statusColumn);

        foreach ($statuses as $status) {
            $alias = $summary->getGrammar()->wrap($status);
            $summary->selectRaw("COALESCE(SUM(CASE WHEN {$column} = ? THEN 1 ELSE 0 END), 0) as {$alias}", [$status]);
        }

        return array_map('intval', (array) $summary->first());
    }

    /**
     * Build the system activity chart buckets for the selected period.
     *
     * @param  array<string, EloquentBuilder>  $sources
     * @return array{labels: string[]} & array<string, int[]>
     */
    private function buildActivitySeries(string $period, array $sources): array
    {
        $driver = DB::connection()->getDriverName();

        $dayExpression = $driver === 'sqlite'
            ? "strftime('%Y-%m-%d', created_at)"
            : 'DATE_FORMAT(created_at, "%Y-%m-%d")';

        $monthExpression = $driver === 'sqlite'
            ? "strftime('%Y-%m', created_at)"
            : 'DATE_FORMAT(created_at, "%Y-%m")';

        if ($period === 'month') {
            $start = now()->subDays(29)->startOfDay();
            $expression = $dayExpression;
            $buckets = [];

            for ($i = 5; $i >= 0; $i--) {
                $bucketEnd = now()->subDays($i * 5);
                $bucketStart = $bucketEnd->copy()->subDays(4);
                $keys = [];

                for ($day = $bucketStart->copy(); $day->lte($bucketEnd); $day = $day->addDay()) {
                    $keys[] = $day->format('Y-m-d');
                }

                $buckets[] = ['label' => $bucketStart->format('M j'), 'keys' => $keys];
            }
        } else {
            $start = now()->subMonths(11)->startOfMonth();
            $expression = $monthExpression;
            $buckets = [];

            for ($i = 11; $i >= 0; $i--) {
                $month = now()->subMonths($i);
                $buckets[] = ['label' => $month->format('M'), 'keys' => [$month->format('Y-m')]];
            }
        }

        $counts = [];

        foreach ($sources as $key => $builder) {
            $counts[$key] = $this->countBy($builder, $expression, $start);
        }

        $labels = [];
        $series = array_fill_keys(array_keys($sources), []);

        foreach ($buckets as $bucket) {
            $labels[] = $bucket['label'];

            foreach (array_keys($sources) as $key) {
                $total = 0;

                foreach ($bucket['keys'] as $bucketKey) {
                    $total += (int) $counts[$key]->get($bucketKey, 0);
                }

                $series[$key][] = $total;
            }
        }

        return ['labels' => $labels] + $series;
    }

    /**
     * Count builder rows grouped by a driver-specific date expression.
     *
     * @return Collection<string, int>
     */
    private function countBy(EloquentBuilder $builder, string $dateExpression, CarbonInterface $start): Collection
    {
        return $builder
            ->where('created_at', '>=', $start)
            ->toBase()
            ->selectRaw("{$dateExpression} as bucket, COUNT(*) as total")
            ->groupBy('bucket')
            ->pluck('total', 'bucket');
    }
}
