import { Head } from '@inertiajs/react';
import {
    Box,
    Building2,
    CheckCircle2,
    ClipboardList,
    Download,
    FileText,
    Star,
} from 'lucide-react';

type StatusCounts = Record<string, number>;

type FacilityUtilizationRow = {
    id: number;
    facility_name: string;
    facility_type: string;
    capacity: number | null;
    location: string | null;
    availability_status: string;
    total: number;
    by_status: {
        pending: number;
        approved: number;
        rejected: number;
        cancelled: number;
    };
    approved_hours: number;
};

type MonthlyActivityRow = {
    month: string;
    bookings: number;
    service_requests: number;
    job_orders: number;
};

type Props = {
    overview: {
        facility_bookings: number;
        service_requests: number;
        job_orders: number;
        completed_job_orders: number;
    };
    monthlyActivity: MonthlyActivityRow[];
    requestStats: { total: number; by_status: StatusCounts };
    jobOrderStats: {
        total: number;
        by_status: StatusCounts;
        average_rating: number;
        rated_count: number;
    };
    inventoryStats: {
        total: number;
        by_condition: StatusCounts;
        by_status: StatusCounts;
        past_service_life: number;
        expiring_soon: number;
    };
    bookingStats: { total: number; by_status: StatusCounts };
    facilityUtilization: FacilityUtilizationRow[];
    incidentStats: {
        total: number;
        by_status: StatusCounts;
        by_type: StatusCounts;
        liabilities_assigned: number;
        liabilities_settled: number;
    };
};

const facilityTypeLabel: Record<string, string> = {
    computer_lab: 'Computer Lab',
    av_room: 'AV Room',
};

const monthlySeries = [
    { key: 'bookings', label: 'Bookings', color: 'bg-[#2f6fd0]' },
    {
        key: 'service_requests',
        label: 'Service Requests',
        color: 'bg-[#55a85a]',
    },
    { key: 'job_orders', label: 'Job Orders', color: 'bg-[#c8663a]' },
] as const;

function MonthlyActivityChart({ data }: { data: MonthlyActivityRow[] }) {
    const peak = Math.max(
        1,
        ...data.flatMap((row) => [
            row.bookings,
            row.service_requests,
            row.job_orders,
        ]),
    );
    const ceiling = Math.max(10, Math.ceil(peak / 10) * 10);
    const ticks = [1, 0.75, 0.5, 0.25, 0].map((ratio) =>
        Math.round(ceiling * ratio),
    );

    return (
        <div>
            <div className="flex gap-3">
                <div className="flex h-52 flex-col justify-between text-right text-[10px] text-slate-400">
                    {ticks.map((tick) => (
                        <span key={tick}>{tick}</span>
                    ))}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="relative h-52">
                        <div className="absolute inset-0 flex flex-col justify-between pb-0">
                            {ticks.map((tick) => (
                                <div
                                    key={tick}
                                    className="border-t border-dashed border-slate-100 last:border-0"
                                    style={{ height: 0 }}
                                />
                            ))}
                        </div>

                        <div className="relative flex h-full items-end gap-2 sm:gap-4">
                            {data.map((row) => (
                                <div
                                    key={row.month}
                                    className="flex h-full flex-1 items-end justify-center gap-1 sm:gap-1.5"
                                >
                                    {monthlySeries.map((series) => {
                                        const value = row[series.key];

                                        return (
                                            <div
                                                key={series.key}
                                                title={`${series.label} · ${row.month}: ${value}`}
                                                className="flex h-full w-full max-w-4 items-end"
                                            >
                                                <div
                                                    className={`w-full rounded-t-[2px] ${series.color} opacity-90 transition-opacity hover:opacity-100`}
                                                    style={{
                                                        height: `${Math.max(1, (value / ceiling) * 100)}%`,
                                                    }}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-2 flex gap-2 border-t border-slate-200 pt-2 sm:gap-4">
                        {data.map((row) => (
                            <span
                                key={row.month}
                                className="flex-1 text-center text-[11px] text-slate-500"
                            >
                                {row.month}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-5">
                {monthlySeries.map((series) => (
                    <span
                        key={series.key}
                        className="flex items-center gap-1.5 text-[11px] text-slate-500"
                    >
                        <span
                            className={`size-2.5 rounded-full ${series.color}`}
                        />
                        {series.label}
                    </span>
                ))}
            </div>
        </div>
    );
}

const overviewCards = [
    {
        key: 'facility_bookings',
        label: 'Facility Bookings',
        icon: Building2,
    },
    {
        key: 'service_requests',
        label: 'Service Requests',
        icon: FileText,
    },
    { key: 'job_orders', label: 'Job Orders', icon: ClipboardList },
    {
        key: 'completed_job_orders',
        label: 'Completed Job Orders',
        icon: CheckCircle2,
    },
] as const;

function BreakdownList({ data }: { data: StatusCounts }) {
    const entries = Object.entries(data);

    if (entries.length === 0) {
        return <p className="text-sm text-slate-500">No data yet.</p>;
    }

    return (
        <div className="flex flex-col gap-2">
            {entries.map(([key, count]) => (
                <div
                    key={key}
                    className="flex items-center justify-between text-sm"
                >
                    <span className="text-slate-400 capitalize">
                        {key.replace('_', ' ')}
                    </span>
                    <span className="font-medium text-slate-600">{count}</span>
                </div>
            ))}
        </div>
    );
}

export default function ReportsIndex({
    overview,
    monthlyActivity,
    requestStats,
    jobOrderStats,
    inventoryStats,
    bookingStats,
    facilityUtilization,
    incidentStats,
}: Props) {
    return (
        <>
            <Head title="Summary Reports" />

            <div className="min-h-full flex-1 bg-slate-50 text-slate-800">
                <div className="relative flex flex-1 flex-col gap-6 overflow-hidden p-4 md:p-6 lg:p-8">
                    {/* Header */}
                    <div className="relative flex items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                    Live Data
                                </span>
                            </div>
                        </div>

                        <a
                            href="/reports/export"
                            className="flex h-9 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:border-ustp-gold/30 hover:bg-ustp-gold/10 hover:text-ustp-gold"
                        >
                            <Download className="size-4" />
                            Export CSV
                        </a>
                    </div>

                    {/* Overview */}
                    <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {overviewCards.map(({ key, label, icon: Icon }) => (
                            <div
                                key={key}
                                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                            >
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <Icon className="size-3.5 text-slate-400" />
                                    {label}
                                </div>
                                <p className="mt-3 text-2xl font-semibold text-slate-800">
                                    {overview[key]}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Monthly activity */}
                    <div className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800">
                                    Monthly Activity
                                </h3>
                                <p className="text-[11px] text-slate-400">
                                    New records over the last six months
                                </p>
                            </div>
                        </div>

                        <MonthlyActivityChart data={monthlyActivity} />

                        <p className="mt-3 border-t border-slate-100 pt-3 text-[11px] text-slate-400">
                            Figures reflect records currently stored in the
                            system.
                        </p>
                    </div>

                    {/* Facility utilization */}
                    <div className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-center gap-3">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800">
                                    Facility Utilization
                                </h3>
                                <p className="text-[11px] text-slate-400">
                                    Reservations and booked hours per facility
                                </p>
                            </div>
                        </div>

                        {facilityUtilization.length === 0 ? (
                            <p className="text-sm text-slate-500">
                                No facilities registered yet.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-180 text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50">
                                            <th className="px-3 py-2.5 text-left text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
                                                Facility
                                            </th>
                                            <th className="px-3 py-2.5 text-left text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
                                                Type
                                            </th>
                                            <th className="px-3 py-2.5 text-center text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
                                                Capacity
                                            </th>
                                            <th className="px-3 py-2.5 text-center text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
                                                Total
                                            </th>
                                            <th className="px-3 py-2.5 text-center text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
                                                Pending
                                            </th>
                                            <th className="px-3 py-2.5 text-center text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
                                                Approved
                                            </th>
                                            <th className="px-3 py-2.5 text-center text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
                                                Rejected
                                            </th>
                                            <th className="px-3 py-2.5 text-center text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
                                                Cancelled
                                            </th>
                                            <th className="px-3 py-2.5 text-center text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
                                                Approved Hours
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {facilityUtilization.map((facility) => (
                                            <tr
                                                key={facility.id}
                                                className="border-b border-slate-100 last:border-0"
                                            >
                                                <td className="px-3 py-3 font-medium text-slate-700">
                                                    {facility.facility_name}
                                                </td>
                                                <td className="px-3 py-3 text-xs text-slate-500">
                                                    {facilityTypeLabel[
                                                        facility.facility_type
                                                    ] ?? facility.facility_type}
                                                </td>
                                                <td className="px-3 py-3 text-center text-xs text-slate-500">
                                                    {facility.capacity ?? '—'}
                                                </td>
                                                <td className="px-3 py-3 text-center text-xs font-semibold text-slate-700">
                                                    {facility.total}
                                                </td>
                                                <td className="px-3 py-3 text-center text-xs text-amber-600">
                                                    {facility.by_status.pending}
                                                </td>
                                                <td className="px-3 py-3 text-center text-xs text-emerald-600">
                                                    {
                                                        facility.by_status
                                                            .approved
                                                    }
                                                </td>
                                                <td className="px-3 py-3 text-center text-xs text-rose-500">
                                                    {
                                                        facility.by_status
                                                            .rejected
                                                    }
                                                </td>
                                                <td className="px-3 py-3 text-center text-xs text-slate-400">
                                                    {
                                                        facility.by_status
                                                            .cancelled
                                                    }
                                                </td>
                                                <td className="px-3 py-3 text-center text-xs font-semibold text-slate-700">
                                                    {facility.approved_hours}h
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Breakdown grid */}
                    <div className="relative grid gap-4 md:grid-cols-2">
                        {/* Service Requests by Status */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <p className="mb-3 text-sm font-medium text-slate-600">
                                Service Requests by Status
                            </p>
                            <BreakdownList data={requestStats.by_status} />
                        </div>

                        {/* Job Orders by Status */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <p className="mb-3 text-sm font-medium text-slate-600">
                                Job Orders by Status
                            </p>
                            <BreakdownList data={jobOrderStats.by_status} />
                        </div>

                        {/* Job Order Satisfaction */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="mb-3 flex items-center justify-between">
                                <p className="text-sm font-medium text-slate-600">
                                    Job Order Satisfaction
                                </p>
                                <div className="flex size-8 items-center justify-center rounded-lg bg-ustp-gold/10 text-ustp-gold">
                                    <Star className="size-4" />
                                </div>
                            </div>
                            {jobOrderStats.rated_count > 0 ? (
                                <>
                                    <p className="text-2xl font-semibold text-slate-800">
                                        {jobOrderStats.average_rating}
                                        <span className="text-sm font-normal text-slate-400">
                                            {' '}
                                            / 5.0
                                        </span>
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Based on {jobOrderStats.rated_count}{' '}
                                        rated job order
                                        {jobOrderStats.rated_count !== 1 && 's'}
                                    </p>
                                </>
                            ) : (
                                <p className="text-sm text-slate-500">
                                    No ratings submitted yet.
                                </p>
                            )}
                        </div>

                        {/* Inventory by Condition */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="mb-3 flex items-center justify-between">
                                <p className="text-sm font-medium text-slate-600">
                                    Inventory by Condition
                                </p>
                                <div className="flex size-8 items-center justify-center rounded-lg bg-ustp-blue-accent/15 text-ustp-light-blue">
                                    <Box className="size-4" />
                                </div>
                            </div>
                            <BreakdownList data={inventoryStats.by_condition} />
                            <p className="mt-2 text-xs text-slate-500">
                                {inventoryStats.total} total items tracked
                            </p>
                        </div>

                        {/* Inventory by Status */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="mb-3 flex items-center justify-between">
                                <p className="text-sm font-medium text-slate-600">
                                    Inventory by Status
                                </p>
                                <div className="flex size-8 items-center justify-center rounded-lg bg-ustp-blue-accent/15 text-ustp-light-blue">
                                    <Box className="size-4" />
                                </div>
                            </div>
                            <BreakdownList data={inventoryStats.by_status} />
                            <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
                                <p>
                                    <span className="font-medium text-slate-700">
                                        {inventoryStats.past_service_life}
                                    </span>{' '}
                                    past service life
                                </p>
                                <p>
                                    <span className="font-medium text-slate-700">
                                        {inventoryStats.expiring_soon}
                                    </span>{' '}
                                    expiring within 30 days
                                </p>
                            </div>
                        </div>

                        {/* Bookings by Status */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <p className="mb-3 text-sm font-medium text-slate-600">
                                Bookings by Status
                            </p>
                            <BreakdownList data={bookingStats.by_status} />
                        </div>

                        {/* Incidents by Type */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <p className="mb-3 text-sm font-medium text-slate-600">
                                Laboratory Incidents by Type
                            </p>
                            <BreakdownList data={incidentStats.by_type} />
                        </div>

                        {/* Incidents by Status */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <p className="mb-3 text-sm font-medium text-slate-600">
                                Laboratory Incidents by Status
                            </p>
                            <BreakdownList data={incidentStats.by_status} />
                        </div>

                        {/* Liability Records */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <p className="mb-3 text-sm font-medium text-slate-600">
                                Liability Records
                            </p>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">Assigned</span>
                                <span className="font-medium text-slate-600">
                                    {incidentStats.liabilities_assigned}
                                </span>
                            </div>
                            <div className="mt-2 flex items-center justify-between text-sm">
                                <span className="text-slate-400">Settled</span>
                                <span className="font-medium text-slate-600">
                                    {incidentStats.liabilities_settled}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
