import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowUpRight,
    BookOpen,
    Calendar,
    Clock,
    ClipboardList,
    FileText,
    Layers,
    Package,
    TrendingUp,
    Wrench,
} from 'lucide-react';

type Period = 'month' | 'year';

type RecentRequest = {
    id: number;
    user_name: string;
    priority: string;
    status: string;
    description: string;
    date: string | null;
};

type RecentJobOrder = {
    id: number;
    technician_name: string;
    status: string;
    date_assigned: string | null;
};

type RecentIncident = {
    id: number;
    reporter_name: string;
    type: string;
    status: string;
    date: string | null;
};

type RecentBooking = {
    id: number;
    user_name: string;
    facility: string;
    status: string;
    date: string | null;
};

type Overview = {
    serviceRequests: {
        total: number;
        pending: number;
        approved?: number;
        completed?: number;
    };
    jobOrders?: { total: number; inProgress: number; unassigned?: number };
    inventory?: { total: number; defective: number };
    bookings?: { total: number; pending: number };
    incidents?: { total: number; unresolved: number };
    pendingActions: { total: number };
};

type PendingActions = {
    requestApprovals: number;
    jobOrdersInProgress?: number;
    rejectedRequests?: number;
    bookingApprovals?: number;
    overdueJobOrders?: number;
    incidentsUnresolved?: number;
};

type InventoryAlerts = {
    expiringSoon: number;
    expired: number;
    defective: number;
    underRepair: number;
};

type ActivitySeries = {
    labels: string[];
    requests?: number[];
    bookings?: number[];
    jobOrders?: number[];
    incidents?: number[];
};

type Props = {
    isAdmin: boolean;
    period: Period | null;
    overview: Overview | null;
    pendingActions: PendingActions | null;
    inventoryAlerts: InventoryAlerts | null;
    activitySeries: ActivitySeries | null;
    recentRequests: RecentRequest[];
    recentJobOrders: RecentJobOrder[];
    recentIncidents: RecentIncident[];
    recentBookings: RecentBooking[];
};

type SeriesKey = 'requests' | 'bookings' | 'jobOrders' | 'incidents';

const SERIES_META: readonly { key: SeriesKey; label: string; color: string }[] =
    [
        { key: 'requests', label: 'Requests', color: '#f59e0b' },
        { key: 'bookings', label: 'Bookings', color: '#10b981' },
        { key: 'jobOrders', label: 'Job Orders', color: '#1a1851' },
        { key: 'incidents', label: 'Incidents', color: '#f43f5e' },
    ];

function LineChart({ data }: { data: ActivitySeries }) {
    const width = 780;
    const height = 250;
    const padTop = 14;
    const padRight = 14;
    const padBottom = 26;
    const padLeft = 38;

    const series = SERIES_META.map((meta) => ({
        ...meta,
        values: data[meta.key] ?? [],
    })).filter((entry) => entry.values.length > 0);

    const max = Math.max(1, ...series.flatMap((entry) => entry.values));
    const step = Math.max(1, Math.ceil(max / 4));
    const yMax = step * 4;

    const count = data.labels.length;
    const xFor = (index: number) =>
        count <= 1
            ? padLeft
            : padLeft + (index * (width - padLeft - padRight)) / (count - 1);
    const yFor = (value: number) =>
        height - padBottom - (value / yMax) * (height - padTop - padBottom);

    const ticks = [0, step, step * 2, step * 3, step * 4];

    return (
        <div>
            <svg
                viewBox={`0 0 ${width} ${height}`}
                className="h-auto w-full"
                role="img"
                aria-label="Monthly system activity line chart"
            >
                {ticks.map((tick) => (
                    <g key={tick}>
                        <line
                            x1={padLeft}
                            x2={width - padRight}
                            y1={yFor(tick)}
                            y2={yFor(tick)}
                            stroke="rgba(15,23,42,0.08)"
                            strokeDasharray={tick === 0 ? undefined : '4 4'}
                        />
                        <text
                            x={padLeft - 8}
                            y={yFor(tick)}
                            textAnchor="end"
                            dominantBaseline="middle"
                            className="fill-slate-400 text-[10px]"
                        >
                            {tick}
                        </text>
                    </g>
                ))}
                {data.labels.map((label, index) => (
                    <text
                        key={`${label}-${index}`}
                        x={xFor(index)}
                        y={height - 8}
                        textAnchor="middle"
                        className="fill-slate-400 text-[10px]"
                    >
                        {label}
                    </text>
                ))}
                {series.map((entry) => (
                    <g key={entry.label}>
                        <polyline
                            fill="none"
                            stroke={entry.color}
                            strokeWidth={2.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={entry.values
                                .map(
                                    (value, index) =>
                                        `${xFor(index)},${yFor(value)}`,
                                )
                                .join(' ')}
                        />
                        {entry.values.map((value, index) => (
                            <circle
                                key={`${entry.label}-${index}`}
                                cx={xFor(index)}
                                cy={yFor(value)}
                                r={3}
                                fill="#ffffff"
                                stroke={entry.color}
                                strokeWidth={2}
                            />
                        ))}
                    </g>
                ))}
            </svg>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                {series.map((entry) => (
                    <span
                        key={entry.label}
                        className="flex items-center gap-1.5 text-xs text-slate-500"
                    >
                        <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: entry.color }}
                        />
                        {entry.label}
                    </span>
                ))}
            </div>
        </div>
    );
}

function ActivityFeed({
    recentRequests,
    recentJobOrders,
    recentIncidents,
    recentBookings,
}: {
    recentRequests: RecentRequest[];
    recentJobOrders: RecentJobOrder[];
    recentIncidents: RecentIncident[];
    recentBookings: RecentBooking[];
}) {
    type ActivityItem = {
        id: string;
        icon: React.ElementType;
        iconBg: string;
        iconText: string;
        title: string;
        subtitle: string;
        date: string | null;
        href: string;
    };

    const items: ActivityItem[] = [];

    recentRequests.forEach((r) => {
        items.push({
            id: `req-${r.id}`,
            icon: FileText,
            iconBg: 'bg-ustp-light-blue/10',
            iconText: 'text-ustp-light-blue',
            title: `Service request from ${r.user_name}`,
            subtitle: `${r.status.replace('_', ' ')} · ${r.priority} priority`,
            date: r.date,
            href: `/requests/${r.id}`,
        });
    });

    recentJobOrders.forEach((jo) => {
        items.push({
            id: `jo-${jo.id}`,
            icon: Wrench,
            iconBg: 'bg-ustp-gold/10',
            iconText: 'text-ustp-gold',
            title: `Job order → ${jo.technician_name}`,
            subtitle: jo.status.replace('_', ' '),
            date: jo.date_assigned,
            href: `/job-orders/${jo.id}`,
        });
    });

    recentIncidents.forEach((i) => {
        items.push({
            id: `inc-${i.id}`,
            icon: AlertTriangle,
            iconBg: 'bg-red-400/10',
            iconText: 'text-red-400',
            title: `Laboratory Incident by ${i.reporter_name}`,
            subtitle: `${i.type} · ${i.status.replace('_', ' ')}`,
            date: i.date,
            href: `/incidents/${i.id}`,
        });
    });

    recentBookings.forEach((b) => {
        items.push({
            id: `bk-${b.id}`,
            icon: Calendar,
            iconBg: 'bg-emerald-400/10',
            iconText: 'text-emerald-400',
            title: `Booking by ${b.user_name}`,
            subtitle: `${b.facility} · ${b.status}`,
            date: b.date,
            href: `/bookings/${b.id}`,
        });
    });

    items.sort((a, b) => {
        if (!a.date) {
            return 1;
        }

        if (!b.date) {
            return -1;
        }

        return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    const visible = items.slice(0, 8);

    return (
        <div className="space-y-0">
            {visible.map((item, idx) => {
                const Icon = item.icon;

                return (
                    <Link
                        key={item.id}
                        href={item.href}
                        className="group -mx-2 flex gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-slate-50"
                    >
                        <div className="relative flex flex-col items-center">
                            <div
                                className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${item.iconBg}`}
                            >
                                <Icon className={`size-4 ${item.iconText}`} />
                            </div>
                            {idx < visible.length - 1 && (
                                <div className="mt-1 w-px flex-1 bg-slate-200" />
                            )}
                        </div>
                        <div className="min-w-0 flex-1 pb-1">
                            <p className="text-sm font-medium text-slate-600 transition-colors group-hover:text-slate-800">
                                {item.title}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-400 capitalize">
                                {item.subtitle}
                            </p>
                        </div>
                        <span className="shrink-0 pt-0.5 text-[11px] text-slate-400">
                            {item.date ? formatRelativeTime(item.date) : ''}
                        </span>
                    </Link>
                );
            })}
            {visible.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-400">
                    No recent activity
                </p>
            )}
        </div>
    );
}

function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) {
        return 'just now';
    }

    if (diffMin < 60) {
        return `${diffMin}m ago`;
    }

    if (diffHr < 24) {
        return `${diffHr}h ago`;
    }

    if (diffDay < 7) {
        return `${diffDay}d ago`;
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Dashboard({
    isAdmin,
    period,
    overview,
    pendingActions,
    inventoryAlerts,
    activitySeries,
    recentRequests,
    recentJobOrders,
    recentIncidents,
    recentBookings,
}: Props) {
    const { auth } = usePage().props as any;
    const user = auth?.user;
    const userName = user?.name?.split(' ')[0] ?? 'User';
    const position: string = (user?.position as string) ?? '';
    const department: string = (user?.department as string) ?? '';

    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const hour = new Date().getHours();
    const greeting =
        hour < 12
            ? 'Good morning'
            : hour < 17
              ? 'Good afternoon'
              : 'Good evening';

    const activePeriod: Period = period ?? 'month';
    const isStudentUser: boolean =
        (user?.role?.role_name as string | undefined) === 'student';

    // ── Quick actions (Faculty/Staff only) ──
    const quickActions = !isAdmin
        ? [
              {
                  label: 'New Service Request',
                  href: '/requests/create',
                  icon: FileText,
                  color: 'bg-ustp-navy text-white hover:bg-ustp-navy/90',
              },
              {
                  label: 'Book a Facility',
                  href: '/bookings/create',
                  icon: Calendar,
                  color: 'bg-ustp-gold text-ustp-navy hover:bg-ustp-gold/90',
              },
              {
                  label: 'Report an Incident',
                  href: '/incidents/create',
                  icon: AlertTriangle,
                  color: 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50',
              },
              {
                  label: 'View My Requests',
                  href: '/requests',
                  icon: BookOpen,
                  color: 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50',
              },
          ].filter(
              (action) =>
                  !(isStudentUser && action.href === '/bookings/create'),
          )
        : [];

    const adminCards =
        overview &&
        overview.jobOrders &&
        overview.inventory &&
        overview.bookings &&
        overview.incidents
            ? [
                  {
                      label: 'Service Requests',
                      value: overview.serviceRequests.total,
                      sub: `${overview.serviceRequests.pending} pending`,
                      icon: FileText,
                      href: '/requests',
                  },
                  {
                      label: 'Job Orders',
                      value: overview.jobOrders.total,
                      sub: `${overview.jobOrders.inProgress} in progress · ${overview.jobOrders.unassigned} unassigned`,
                      icon: ClipboardList,
                      href: '/job-orders',
                  },
                  {
                      label: 'ICT Inventory',
                      value: overview.inventory.total,
                      sub: `${overview.inventory.defective} defective`,
                      icon: Package,
                      href: '/inventory',
                  },
                  {
                      label: 'Facility Bookings',
                      value: overview.bookings.total,
                      sub: `${overview.bookings.pending} pending`,
                      icon: Calendar,
                      href: '/bookings',
                  },
                  {
                      label: 'Lab Incidents',
                      value: overview.incidents.total,
                      sub: `${overview.incidents.unresolved} unresolved`,
                      icon: AlertTriangle,
                      href: '/incidents',
                  },
                  {
                      label: 'Pending Actions',
                      value: overview.pendingActions.total,
                      sub: 'Needs attention',
                      icon: Clock,
                      href: '/requests/approvals',
                  },
              ]
            : [];

    const userCards = overview
        ? [
              {
                  label: 'Service Requests',
                  value: overview.serviceRequests.total,
                  sub: `${overview.serviceRequests.pending} pending`,
                  icon: FileText,
                  href: '/requests',
              },
              ...(overview.bookings
                  ? [
                        {
                            label: 'Facility Bookings',
                            value: overview.bookings.total,
                            sub: `${overview.bookings.pending} pending`,
                            icon: Calendar,
                            href: '/bookings',
                        },
                    ]
                  : []),
              ...(overview.incidents
                  ? [
                        {
                            label: 'Lab Incidents',
                            value: overview.incidents.total,
                            sub: `${overview.incidents.unresolved} unresolved`,
                            icon: AlertTriangle,
                            href: '/incidents',
                        },
                    ]
                  : []),
              ...(overview.serviceRequests.approved !== undefined
                  ? [
                        {
                            label: 'Approved Requests',
                            value: overview.serviceRequests.approved,
                            sub: 'awaiting completion',
                            icon: Layers,
                            href: '/requests',
                        },
                    ]
                  : []),
              ...(overview.serviceRequests.completed !== undefined
                  ? [
                        {
                            label: 'Completed Requests',
                            value: overview.serviceRequests.completed,
                            sub: 'resolved successfully',
                            icon: ClipboardList,
                            href: '/requests',
                        },
                    ]
                  : []),
              {
                  label: 'Pending Actions',
                  value: overview.pendingActions.total,
                  sub: 'Needs attention',
                  icon: Clock,
                  href: '/requests',
              },
          ]
        : [];

    const cards = isAdmin ? adminCards : userCards;

    const actionRows = !pendingActions
        ? []
        : isAdmin
          ? [
                {
                    label: 'Booking approvals',
                    value: pendingActions.bookingApprovals ?? 0,
                    href: '/bookings/approvals',
                },
                {
                    label: 'Service request approvals',
                    value: pendingActions.requestApprovals,
                    href: '/requests/approvals',
                },
                {
                    label: 'Job orders in progress',
                    value: pendingActions.jobOrdersInProgress ?? 0,
                    href: '/job-orders/progress',
                },
                {
                    label: 'Overdue job orders (SLA)',
                    value: pendingActions.overdueJobOrders ?? 0,
                    href: '/job-orders/progress',
                },
                {
                    label: 'Unresolved incidents',
                    value: pendingActions.incidentsUnresolved ?? 0,
                    href: '/incidents',
                },
            ]
          : [
                {
                    label: 'Requests awaiting approval',
                    value: pendingActions.requestApprovals,
                    href: '/requests',
                },
                ...(pendingActions.bookingApprovals !== undefined
                    ? [
                          {
                              label: 'Bookings awaiting approval',
                              value: pendingActions.bookingApprovals,
                              href: '/bookings',
                          },
                      ]
                    : []),
                ...(pendingActions.incidentsUnresolved !== undefined
                    ? [
                          {
                              label: 'Open incidents',
                              value: pendingActions.incidentsUnresolved,
                              href: '/incidents',
                          },
                      ]
                    : []),
                ...(pendingActions.rejectedRequests !== undefined
                    ? [
                          {
                              label: 'Rejected requests',
                              value: pendingActions.rejectedRequests,
                              href: '/requests',
                          },
                      ]
                    : []),
            ];
    const maxActionValue = Math.max(1, ...actionRows.map((row) => row.value));

    const alertRows = inventoryAlerts
        ? [
              {
                  label: 'Expiring Soon',
                  sub: 'Within the next 30 days',
                  value: inventoryAlerts.expiringSoon,
                  href: '/inventory/expirations',
                  icon: Clock,
              },
              {
                  label: 'Expired',
                  sub: 'Past expiration date',
                  value: inventoryAlerts.expired,
                  href: '/inventory/expirations',
                  icon: AlertTriangle,
              },
              {
                  label: 'Defective Equipment',
                  sub: 'Requires inspection',
                  value: inventoryAlerts.defective,
                  href: '/inventory/defective',
                  icon: Wrench,
              },
              {
                  label: 'Under Repair',
                  sub: 'Currently being serviced',
                  value: inventoryAlerts.underRepair,
                  href: '/inventory/under-repair',
                  icon: Package,
              },
          ]
        : [];

    return (
        <>
            <Head title="Dashboard" />
            <div className="min-h-full flex-1 bg-slate-50 text-slate-800">
                <div className="relative flex flex-1 flex-col gap-6 overflow-hidden p-4 md:p-6 lg:p-8">
                    {/* ── Greeting Banner ── */}
                    <div className="relative overflow-hidden rounded-2xl bg-ustp-navy px-6 py-6 shadow-lg shadow-ustp-navy/20 sm:px-8 sm:py-7">
                        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                {(position || department) && (
                                    <p className="mb-1 flex flex-wrap items-center gap-x-2 text-xs text-white/50">
                                        {position && <span>{position}</span>}
                                        {department && (
                                            <span>{department}</span>
                                        )}
                                    </p>
                                )}
                                <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                                    {greeting},{' '}
                                    <span className="text-ustp-gold">
                                        {userName}!
                                    </span>
                                </h2>
                                <p className="mt-1 text-sm text-white/60">
                                    {today}
                                </p>
                            </div>

                            {/* Period filter */}
                            <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
                                {(['month', 'year'] as const).map((value) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() =>
                                            router.get(
                                                '/dashboard',
                                                { period: value },
                                                {
                                                    preserveScroll: true,
                                                    preserveState: true,
                                                },
                                            )
                                        }
                                        className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                                            activePeriod === value
                                                ? 'bg-ustp-gold text-ustp-navy'
                                                : 'text-white/60 hover:bg-white/10 hover:text-white'
                                        }`}
                                    >
                                        {value === 'month'
                                            ? 'Monthly'
                                            : 'Yearly'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Quick Actions (Faculty/Staff only) ── */}
                    {quickActions.length > 0 && (
                        <div>
                            <h2 className="mb-3 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                                Quick Actions
                            </h2>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                {quickActions.map((action) => (
                                    <Link
                                        key={action.label}
                                        href={action.href}
                                        className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${action.color}`}
                                    >
                                        <action.icon className="size-4 shrink-0" />
                                        <span className="leading-tight">
                                            {action.label}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Stat cards ── */}
                    {cards.length > 0 && (
                        <div>
                            <h2 className="mb-3 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                                Overview
                            </h2>
                            <div
                                className={`grid grid-cols-2 gap-4 ${cards.length >= 5 ? 'lg:grid-cols-3' : 'lg:max-w-2xl'}`}
                            >
                                {cards.map((card) => (
                                    <Link
                                        key={card.label}
                                        href={card.href}
                                        className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <p className="text-sm font-medium text-slate-500">
                                                {card.label}
                                            </p>
                                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ustp-navy/5">
                                                <card.icon className="size-5 text-ustp-navy" />
                                            </div>
                                        </div>
                                        <p className="mt-4 text-4xl font-bold tracking-tight text-slate-800">
                                            {card.value}
                                        </p>
                                        <p className="mt-2 text-xs text-slate-400 group-hover:text-slate-500">
                                            {card.sub}
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Activity chart + Pending actions ── */}
                    {actionRows.length > 0 && (
                        <div
                            className={
                                activitySeries
                                    ? 'grid gap-5 lg:grid-cols-3'
                                    : ''
                            }
                        >
                            {activitySeries && (
                                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
                                    <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex size-9 items-center justify-center rounded-lg bg-ustp-light-blue/10">
                                                <TrendingUp className="size-4 text-ustp-light-blue" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-semibold text-slate-800">
                                                    Monthly System Activity
                                                </h3>
                                                <p className="text-[11px] text-slate-400">
                                                    Activity by operational
                                                    module
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-5">
                                        <LineChart data={activitySeries} />
                                    </div>
                                </div>
                            )}

                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex size-9 items-center justify-center rounded-lg bg-orange-50">
                                            <Clock className="size-4 text-orange-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-800">
                                                Pending Actions
                                            </h3>
                                            <p className="text-[11px] text-slate-400">
                                                Queues that need attention
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4 p-5">
                                    {actionRows.map((row) => (
                                        <Link
                                            key={row.label}
                                            href={row.href}
                                            className="group block"
                                        >
                                            <div className="mb-1.5 flex items-center justify-between gap-2">
                                                <span className="text-xs font-medium text-slate-600 transition-colors group-hover:text-slate-800">
                                                    {row.label}
                                                </span>
                                                <span className="text-xs font-semibold text-slate-800">
                                                    {row.value}
                                                </span>
                                            </div>
                                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                                <div
                                                    className="h-full rounded-full bg-ustp-navy transition-all duration-700"
                                                    style={{
                                                        width: `${(row.value / maxActionValue) * 100}%`,
                                                    }}
                                                />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Admin: Inventory alerts ── */}
                    {isAdmin && alertRows.length > 0 && (
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-9 items-center justify-center rounded-lg bg-rose-50">
                                        <AlertTriangle className="size-4 text-rose-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-800">
                                            Inventory Alerts
                                        </h3>
                                        <p className="text-[11px] text-slate-400">
                                            Items requiring action
                                        </p>
                                    </div>
                                </div>
                                <Link
                                    href="/inventory"
                                    className="group flex items-center gap-1 text-xs font-medium text-ustp-light-blue/70 transition-colors hover:text-ustp-light-blue"
                                >
                                    View all
                                    <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                </Link>
                            </div>
                            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
                                {alertRows.map((row) => (
                                    <Link
                                        key={row.label}
                                        href={row.href}
                                        className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition-all hover:border-slate-300 hover:bg-white hover:shadow-sm"
                                    >
                                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                                            <row.icon className="size-4 text-slate-600" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-semibold text-slate-700 group-hover:text-slate-900">
                                                {row.label}
                                            </p>
                                            <p className="truncate text-[11px] text-slate-400">
                                                {row.sub}
                                            </p>
                                        </div>
                                        <span className="ml-auto text-lg font-semibold text-slate-800">
                                            {row.value}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Recent Activity ── */}
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <div className="flex items-center gap-3">
                                <div className="flex size-9 items-center justify-center rounded-lg bg-slate-100">
                                    <Clock className="size-4 text-slate-500" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-800">
                                        Recent Activity
                                    </h3>
                                    <p className="text-[11px] text-slate-400">
                                        Across all modules
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="p-5">
                            <ActivityFeed
                                recentRequests={recentRequests}
                                recentJobOrders={recentJobOrders}
                                recentIncidents={recentIncidents}
                                recentBookings={recentBookings}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

Dashboard.layout = () => ({
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: '/dashboard',
        },
    ],
});
