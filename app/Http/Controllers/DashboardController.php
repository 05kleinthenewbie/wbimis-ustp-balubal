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
        $user = $request->user()->load('role');

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

        if ($isAdmin) {
            $stats = [
                'pendingRequests' => ServiceRequest::where('request_status', 'pending')->count(),
                'openJobOrders' => JobOrder::whereIn('status', ['open', 'in_progress'])->count(),
                'pendingBookings' => Booking::where('booking_status', 'pending')->count(),
                'openIncidents' => IncidentReport::whereIn('status', ['open', 'under_review'])->count(),
                'technicians' => User::whereHas('role', fn ($query) => $query->where('role_name', 'ict_admin'))->count(),
                'unassignedJobOrders' => JobOrder::whereNull('assigned_to')->count(),
                'overdueJobOrders' => JobOrder::whereIn('status', ['open', 'in_progress'])
                    ->whereNotNull('sla_deadline')
                    ->where('sla_deadline', '<', now())
                    ->count(),
                'inventoryExpiryAlerts' => InventoryItem::whereNotNull('expiration_date')
                    ->where(function ($query) {
                        $query->where('expiration_date', '<', now()->startOfDay())
                            ->orWhereBetween('expiration_date', [now()->startOfDay(), now()->addDays(30)->endOfDay()]);
                    })
                    ->count(),
            ];

            $inventorySummary = [
                'working' => InventoryItem::where('condition', 'working')->count(),
                'defective' => InventoryItem::where('condition', 'defective')->count(),
                'under_repair' => InventoryItem::where('condition', 'under_repair')->count(),
            ];

            $overview = [
                'serviceRequests' => [
                    'total' => ServiceRequest::whereBetween('created_at', $periodRange)->count(),
                    'pending' => ServiceRequest::where('request_status', 'pending')->count(),
                ],
                'jobOrders' => [
                    'total' => JobOrder::whereBetween('created_at', $periodRange)->count(),
                    'inProgress' => JobOrder::where('status', 'in_progress')->count(),
                    'unassigned' => $stats['unassignedJobOrders'],
                ],
                'inventory' => [
                    'total' => InventoryItem::count(),
                    'defective' => $inventorySummary['defective'],
                ],
                'bookings' => [
                    'total' => Booking::whereBetween('created_at', $periodRange)->count(),
                    'pending' => $stats['pendingBookings'],
                ],
                'incidents' => [
                    'total' => IncidentReport::whereBetween('created_at', $periodRange)->count(),
                    'unresolved' => $stats['openIncidents'],
                ],
            ];

            $pendingActions = [
                'bookingApprovals' => $stats['pendingBookings'],
                'requestApprovals' => $stats['pendingRequests'],
                'jobOrdersInProgress' => JobOrder::where('status', 'in_progress')->count(),
                'overdueJobOrders' => $stats['overdueJobOrders'],
                'incidentsUnresolved' => $stats['openIncidents'],
            ];

            $overview['pendingActions'] = ['total' => array_sum($pendingActions)];

            $inventoryAlerts = [
                'expiringSoon' => InventoryItem::whereNotNull('expiration_date')
                    ->whereBetween('expiration_date', [now()->startOfDay(), now()->addDays(30)->endOfDay()])
                    ->count(),
                'expired' => InventoryItem::whereNotNull('expiration_date')
                    ->where('expiration_date', '<', now()->startOfDay())
                    ->count(),
                'defective' => $inventorySummary['defective'],
                'underRepair' => $inventorySummary['under_repair'],
            ];

            $activitySeries = $this->buildActivitySeries($period, [
                'requests' => ServiceRequest::query(),
                'bookings' => Booking::query(),
                'jobOrders' => JobOrder::query(),
            ]);

            $recentRequests = ServiceRequest::with('user')
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

            $recentJobOrders = JobOrder::with(['technician', 'serviceRequest'])
                ->latest()
                ->take(5)
                ->get()
                ->map(fn (JobOrder $jo) => [
                    'id' => $jo->id,
                    'technician_name' => $jo->technician?->name ?? 'Unassigned',
                    'status' => $jo->status,
                    'date_assigned' => $jo->date_assigned?->toIso8601String(),
                ]);

            $recentIncidents = IncidentReport::with('reporter')
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

            $recentBookings = Booking::with(['user', 'facility'])
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
                'myRequests' => ServiceRequest::where('user_id', $user->id)->count(),
                'pendingRequests' => ServiceRequest::where('user_id', $user->id)
                    ->where('request_status', 'pending')->count(),
            ];

            $approvedRequests = ServiceRequest::where('user_id', $user->id)
                ->where('request_status', 'approved')->count();
            $completedRequests = ServiceRequest::where('user_id', $user->id)
                ->where('request_status', 'completed')->count();
            $rejectedRequests = ServiceRequest::where('user_id', $user->id)
                ->where('request_status', 'rejected')->count();

            $overview = [
                'serviceRequests' => [
                    'total' => ServiceRequest::where('user_id', $user->id)
                        ->whereBetween('created_at', $periodRange)->count(),
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

            $unresolvedIncidents = IncidentReport::where('reported_by', $user->id)
                ->whereIn('status', ['open', 'under_review'])->count();
            $overview['incidents'] = [
                'total' => IncidentReport::where('reported_by', $user->id)
                    ->whereBetween('created_at', $periodRange)->count(),
                'unresolved' => $unresolvedIncidents,
            ];
            $pendingActions['incidentsUnresolved'] = $unresolvedIncidents;
            $activitySources['incidents'] = IncidentReport::where('reported_by', $user->id);

            if (! $isStudent) {
                $pendingBookings = Booking::where('user_id', $user->id)
                    ->where('booking_status', 'pending')->count();

                $overview['bookings'] = [
                    'total' => Booking::where('user_id', $user->id)
                        ->whereBetween('created_at', $periodRange)->count(),
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
