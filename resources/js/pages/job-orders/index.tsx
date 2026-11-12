import { Head, Link } from '@inertiajs/react';
import {
    ClipboardList,
    ArrowUpRight,
    Search,
    X,
    Clock3,
    CheckCircle2,
    Wrench,
} from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

type JobOrderItem = {
    id: number;
    status: string;
    priority_level: string | null;
    replacement_due: boolean;
    date_assigned: string | null;
    service_request: {
        user: { name: string };
        request_services: { service_type: { service_name: string } }[];
    };
    technician: { name: string } | null;
};

type Props = {
    jobOrders: JobOrderItem[] | { data: JobOrderItem[] };
};

const statusConfig: Record<
    string,
    { badge: string; icon: typeof CheckCircle2 }
> = {
    open: {
        badge: 'border-slate-200 bg-slate-50 text-slate-600',
        icon: Clock3,
    },
    in_progress: {
        badge: 'border-amber-200 bg-amber-50 text-amber-700',
        icon: Wrench,
    },
    completed: {
        badge: 'border-ustp-light-blue/30 bg-ustp-light-blue/10 text-ustp-light-blue',
        icon: CheckCircle2,
    },
    closed: {
        badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        icon: CheckCircle2,
    },
};

const priorityConfig: Record<string, { label: string; badge: string }> = {
    urgent: { label: 'Urgent', badge: 'border-red-200 bg-red-50 text-red-700' },
    high: {
        label: 'High',
        badge: 'border-orange-200 bg-orange-50 text-orange-700',
    },
    medium: {
        label: 'Medium',
        badge: 'border-slate-200 bg-slate-50 text-slate-600',
    },
    low: { label: 'Low', badge: 'border-sky-200 bg-sky-50 text-sky-700' },
};

export default function JobOrdersIndex({ jobOrders }: Props) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const jobOrderList = Array.isArray(jobOrders)
        ? jobOrders
        : (jobOrders.data ?? []);

    const priorityOf = (priority: string | null) =>
        priorityConfig[priority ?? 'medium'] ?? priorityConfig.medium;

    const stats = {
        total: jobOrderList.length,
        open: jobOrderList.filter((j) => j.status === 'open').length,
        in_progress: jobOrderList.filter((j) => j.status === 'in_progress')
            .length,
        completed: jobOrderList.filter((j) => j.status === 'completed').length,
        closed: jobOrderList.filter((j) => j.status === 'closed').length,
    };

    const filtered = jobOrderList.filter((jo) => {
        const q = search.toLowerCase();
        const matchesSearch =
            jo.service_request.user.name.toLowerCase().includes(q) ||
            jo.technician?.name?.toLowerCase().includes(q) ||
            jo.service_request.request_services.some((s) =>
                s.service_type.service_name.toLowerCase().includes(q),
            ) ||
            String(jo.id).includes(q);
        const matchesStatus =
            statusFilter === 'all' || jo.status === statusFilter;

        return matchesSearch && matchesStatus;
    });
    const hasActiveFilter = statusFilter !== 'all' || search;

    return (
        <>
            <Head title="Job Orders" />

            <div className="min-h-full flex-1 bg-slate-50 text-slate-800">
                <div className="relative flex flex-1 flex-col gap-6 overflow-hidden p-4 md:p-6 lg:p-8">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                        {[
                            {
                                key: 'all',
                                label: 'Total Orders',
                                value: stats.total,
                            },
                            {
                                key: 'open',
                                label: 'Open',
                                value: stats.open,
                            },
                            {
                                key: 'in_progress',
                                label: 'In Progress',
                                value: stats.in_progress,
                            },
                            {
                                key: 'completed',
                                label: 'Completed',
                                value: stats.completed,
                            },
                            {
                                key: 'closed',
                                label: 'Closed',
                                value: stats.closed,
                            },
                        ].map((card) => (
                            <button
                                key={card.key}
                                type="button"
                                aria-pressed={statusFilter === card.key}
                                onClick={() =>
                                    setStatusFilter((current) =>
                                        current === card.key &&
                                        card.key !== 'all'
                                            ? 'all'
                                            : card.key,
                                    )
                                }
                                className={`cursor-pointer rounded-2xl border p-4 text-left shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ustp-navy ${
                                    statusFilter === card.key
                                        ? 'border-ustp-navy bg-ustp-navy/5 ring-1 ring-ustp-navy'
                                        : 'border-slate-200 bg-white hover:border-slate-400'
                                }`}
                            >
                                <p className="text-2xl font-semibold text-slate-800">
                                    {card.value}
                                </p>
                                <p className="text-[11px] text-slate-400">
                                    {card.label}
                                </p>
                            </button>
                        ))}
                    </div>
                    {/* Toolbar */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />

                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by ID, service, requester, or technician..."
                                className="h-10 border-slate-300 bg-white pl-9 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:border-ustp-gold/40 focus-visible:ring-1 focus-visible:ring-ustp-gold/20"
                            />

                            {search && (
                                <button
                                    onClick={() => setSearch('')}
                                    className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            {hasActiveFilter && (
                                <button
                                    onClick={() => {
                                        setStatusFilter('all');
                                        setSearch('');
                                    }}
                                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                                >
                                    <X className="size-3" />
                                    Clear filters
                                </button>
                            )}

                            <div className="text-[11px] text-slate-400">
                                {filtered.length} job order
                                {filtered.length !== 1 ? 's' : ''}
                            </div>
                        </div>
                    </div>

                    {/* Empty */}
                    {filtered.length === 0 ? (
                        <div className="relative flex min-h-90 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 text-center">
                            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-ustp-gold/10 text-ustp-gold">
                                <ClipboardList className="size-6" />
                            </div>

                            <h2 className="text-sm font-medium text-slate-800">
                                {hasActiveFilter
                                    ? 'No matching job orders'
                                    : 'No job orders yet'}
                            </h2>

                            <p className="mt-1.5 max-w-sm text-xs leading-5 text-slate-400">
                                {hasActiveFilter
                                    ? 'Try adjusting your search or filter criteria.'
                                    : 'Job orders will appear here when service requests are assigned.'}
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table */}
                            <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
                                <table className="w-full text-sm">
                                    <thead className="border-b border-slate-200 bg-slate-50">
                                        <tr>
                                            <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                Job Order
                                            </th>
                                            <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                Requested by
                                            </th>
                                            <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                Technician
                                            </th>
                                            <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                Priority
                                            </th>
                                            <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                Status
                                            </th>
                                            <th className="w-16 px-5 py-3.5" />
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {filtered.map((jobOrder) => (
                                            <tr
                                                key={jobOrder.id}
                                                className="border-b border-slate-200 transition-colors last:border-0 hover:bg-slate-50"
                                            >
                                                <td className="px-5 py-4">
                                                    <div className="flex items-start gap-3">
                                                        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-ustp-gold/10 text-ustp-gold">
                                                            <ClipboardList className="size-4" />
                                                        </div>

                                                        <div className="min-w-0">
                                                            <p className="font-mono text-[10px] text-slate-400">
                                                                JO-
                                                                {String(
                                                                    jobOrder.id,
                                                                ).padStart(
                                                                    4,
                                                                    '0',
                                                                )}
                                                            </p>

                                                            <p className="mt-0.5 truncate font-medium text-slate-800">
                                                                {jobOrder.service_request.request_services
                                                                    .map(
                                                                        (s) =>
                                                                            s
                                                                                .service_type
                                                                                .service_name,
                                                                    )
                                                                    .join(', ')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4 text-sm text-slate-600">
                                                    {
                                                        jobOrder.service_request
                                                            .user.name
                                                    }
                                                </td>

                                                <td className="px-5 py-4">
                                                    <span
                                                        className={`text-xs ${jobOrder.technician ? 'text-slate-600' : 'text-slate-400 italic'}`}
                                                    >
                                                        {jobOrder.technician
                                                            ?.name ??
                                                            'Unassigned'}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="flex flex-col gap-1.5">
                                                        <span
                                                            className={`inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${priorityOf(jobOrder.priority_level).badge}`}
                                                        >
                                                            {
                                                                priorityOf(
                                                                    jobOrder.priority_level,
                                                                ).label
                                                            }
                                                        </span>
                                                        {jobOrder.replacement_due && (
                                                            <span className="text-[10px] font-medium text-amber-600">
                                                                Replacement due
                                                                (&gt;5 days)
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <span
                                                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize ${statusConfig[jobOrder.status]?.badge ?? 'border-slate-200 bg-slate-50 text-slate-500'}`}
                                                    >
                                                        {jobOrder.status.replace(
                                                            '_',
                                                            ' ',
                                                        )}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4 text-right">
                                                    <Link
                                                        href={`/job-orders/${jobOrder.id}`}
                                                        className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-ustp-gold"
                                                    >
                                                        View
                                                        <ArrowUpRight className="size-3.5" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="space-y-3 md:hidden">
                                {filtered.map((jobOrder) => (
                                    <Link
                                        key={jobOrder.id}
                                        href={`/job-orders/${jobOrder.id}`}
                                        className="block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                                    >
                                        <div className="p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex min-w-0 gap-3">
                                                    <div className="min-w-0">
                                                        <p className="font-mono text-[10px] text-slate-400">
                                                            JO-
                                                            {String(
                                                                jobOrder.id,
                                                            ).padStart(4, '0')}
                                                        </p>
                                                        <p className="mt-0.5 truncate font-medium text-slate-800">
                                                            {jobOrder.service_request.request_services
                                                                .map(
                                                                    (s) =>
                                                                        s
                                                                            .service_type
                                                                            .service_name,
                                                                )
                                                                .join(', ')}
                                                        </p>
                                                    </div>
                                                </div>

                                                <span
                                                    className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${statusConfig[jobOrder.status]?.badge ?? 'border-slate-200 bg-slate-50 text-slate-500'}`}
                                                >
                                                    {jobOrder.status.replace(
                                                        '_',
                                                        ' ',
                                                    )}
                                                </span>
                                            </div>

                                            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                                                <span>
                                                    {
                                                        jobOrder.service_request
                                                            .user.name
                                                    }
                                                </span>
                                                <span
                                                    className={
                                                        jobOrder.technician
                                                            ? 'text-slate-500'
                                                            : 'italic'
                                                    }
                                                >
                                                    {jobOrder.technician
                                                        ?.name ?? 'Unassigned'}
                                                </span>
                                            </div>

                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                                <span
                                                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${priorityOf(jobOrder.priority_level).badge}`}
                                                >
                                                    {
                                                        priorityOf(
                                                            jobOrder.priority_level,
                                                        ).label
                                                    }
                                                </span>
                                                {jobOrder.replacement_due && (
                                                    <span className="text-[10px] font-medium text-amber-600">
                                                        Replacement due (&gt;5
                                                        days)
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
