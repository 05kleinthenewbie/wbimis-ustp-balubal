import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowUpRight,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    Clock3,
    Search,
    Wrench,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Input } from '@/components/ui/input';

type JobOrderItem = {
    id: number;
    job_order_number: string | null;
    status: string;
    priority_level: string | null;
    replacement_due: boolean;
    date_assigned: string | null;
    sla_deadline: string | null;
    service_request: {
        id: number;
        user: { name: string };
        request_services: { service_type: { service_name: string } }[];
    };
    technician: { name: string } | null;
};

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type PaginatedJobOrders = {
    data: JobOrderItem[];
    links: PaginationLink[];
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
};

type Filters = {
    search?: string | null;
    status?: string | null;
    sort?: string | null;
};

type Stats = {
    total: number;
    open: number;
    in_progress: number;
    completed: number;
    closed: number;
    unassigned: number;
};

type Props = {
    jobOrders: PaginatedJobOrders;
    filters: Filters;
    stats: Stats;
};

const statusConfig: Record<
    string,
    { label: string; badge: string; icon: typeof CheckCircle2 }
> = {
    open: {
        label: 'Awaiting technician',
        badge: 'border-amber-200 bg-amber-50 text-amber-700',
        icon: Clock3,
    },
    in_progress: {
        label: 'In progress',
        badge: 'border-sky-200 bg-sky-50 text-sky-700',
        icon: Wrench,
    },
    completed: {
        label: 'Awaiting verification',
        badge: 'border-violet-200 bg-violet-50 text-violet-700',
        icon: CheckCircle2,
    },
    closed: {
        label: 'Completed',
        badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        icon: CheckCircle2,
    },
};

function nextStepFor(jobOrder: JobOrderItem): {
    label: string;
    className: string;
} | null {
    if (jobOrder.status === 'open') {
        return jobOrder.technician
            ? {
                  label: 'Start work',
                  className: 'border-sky-200 bg-sky-50 text-sky-700',
              }
            : {
                  label: 'Assign technician',
                  className:
                      'border-ustp-gold/40 bg-ustp-gold/10 text-ustp-gold-dark',
              };
    }

    if (jobOrder.status === 'in_progress') {
        return {
            label: 'Monitor work',
            className: 'border-sky-200 bg-sky-50 text-sky-700',
        };
    }

    if (jobOrder.status === 'completed') {
        return {
            label: 'Waiting for requester',
            className: 'border-slate-200 bg-slate-50 text-slate-500',
        };
    }

    if (jobOrder.status === 'closed') {
        return {
            label: 'Done',
            className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        };
    }

    return null;
}

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

function formatDate(value: string | null): string {
    if (!value) {
        return 'Not scheduled';
    }

    return new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

export default function JobOrdersIndex({ jobOrders, filters, stats }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [statusFilter, setStatusFilter] = useState(filters.status ?? 'all');
    const isInitialRender = useRef(true);

    useEffect(() => {
        if (isInitialRender.current) {
            isInitialRender.current = false;

            return;
        }

        const timeout = window.setTimeout(() => {
            router.get(
                '/job-orders',
                {
                    search: search || undefined,
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                },
            );
        }, 350);

        return () => window.clearTimeout(timeout);
    }, [search, statusFilter]);

    const hasActiveFilter = statusFilter !== 'all' || search.length > 0;

    function clearFilters() {
        setStatusFilter('all');
        setSearch('');
    }

    const cards = [
        { key: 'all', label: 'Total job orders', value: stats.total },
        { key: 'open', label: 'Awaiting technician', value: stats.open },
        { key: 'in_progress', label: 'In progress', value: stats.in_progress },
        {
            key: 'completed',
            label: 'Awaiting verification',
            value: stats.completed,
        },
        { key: 'closed', label: 'Completed', value: stats.closed },
    ];

    return (
        <>
            <Head title="Job Orders" />

            <div className="min-h-full flex-1 bg-slate-50 text-slate-800">
                <div className="relative flex flex-1 flex-col gap-5 overflow-hidden p-4 md:p-6 lg:p-8">
                    <PageHeader
                        title="Job Orders"
                        description="Assign technicians, monitor active work, and verify completed service."
                        icon={ClipboardList}
                    />

                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                        {cards.map((card) => (
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

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />

                            <Input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Search by ID, service, requester, or technician..."
                                className="h-10 border-slate-300 bg-white pl-9 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:border-ustp-gold/40 focus-visible:ring-1 focus-visible:ring-ustp-gold/20"
                            />

                            {search && (
                                <button
                                    type="button"
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
                                    type="button"
                                    onClick={clearFilters}
                                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                                >
                                    <X className="size-3" />
                                    Clear filters
                                </button>
                            )}

                            <div className="text-[11px] text-slate-400">
                                {jobOrders.total} job order
                                {jobOrders.total === 1 ? '' : 's'}
                            </div>
                        </div>
                    </div>

                    {jobOrders.data.length === 0 ? (
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
                                    : 'Approve a pending service request and its job order will appear here automatically.'}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
                                <table className="w-full text-sm">
                                    <thead className="border-b border-slate-200 bg-slate-50">
                                        <tr>
                                            {[
                                                'Job order',
                                                'Requested by',
                                                'Technician',
                                                'Priority',
                                                'Status',
                                                'Next step',
                                                '',
                                            ].map((heading) => (
                                                <th
                                                    key={heading}
                                                    className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase"
                                                >
                                                    {heading}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {jobOrders.data.map((jobOrder) => {
                                            const status =
                                                statusConfig[jobOrder.status] ??
                                                statusConfig.open;
                                            const priority =
                                                priorityConfig[
                                                    jobOrder.priority_level ??
                                                        'medium'
                                                ] ?? priorityConfig.medium;
                                            const nextStep =
                                                nextStepFor(jobOrder);

                                            return (
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
                                                                    {jobOrder.job_order_number ??
                                                                        `JO-${String(jobOrder.id).padStart(4, '0')}`}
                                                                </p>

                                                                <p className="mt-0.5 truncate font-medium text-slate-800">
                                                                    {jobOrder.service_request.request_services
                                                                        .map(
                                                                            (
                                                                                item,
                                                                            ) =>
                                                                                item
                                                                                    .service_type
                                                                                    .service_name,
                                                                        )
                                                                        .join(
                                                                            ', ',
                                                                        )}
                                                                </p>

                                                                <p className="mt-0.5 text-[10px] text-slate-400">
                                                                    Request #
                                                                    {
                                                                        jobOrder
                                                                            .service_request
                                                                            .id
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-5 py-4 text-sm text-slate-600">
                                                        {
                                                            jobOrder
                                                                .service_request
                                                                .user.name
                                                        }
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        <span
                                                            className={`text-xs ${jobOrder.technician ? 'text-slate-600' : 'text-amber-600 italic'}`}
                                                        >
                                                            {jobOrder.technician
                                                                ?.name ??
                                                                'Needs assignment'}
                                                        </span>
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        <div className="flex flex-col gap-1.5">
                                                            <span
                                                                className={`inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${priority.badge}`}
                                                            >
                                                                {priority.label}
                                                            </span>
                                                            {jobOrder.replacement_due && (
                                                                <span className="text-[10px] font-medium text-amber-600">
                                                                    Replacement
                                                                    due (&gt;5
                                                                    days)
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        <span
                                                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${status.badge}`}
                                                        >
                                                            {status.label}
                                                        </span>
                                                        <p className="mt-1 text-[10px] text-slate-400">
                                                            Assigned{' '}
                                                            {formatDate(
                                                                jobOrder.date_assigned,
                                                            )}
                                                        </p>
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        {nextStep ? (
                                                            <Link
                                                                href={`/job-orders/${jobOrder.id}`}
                                                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors hover:brightness-95 ${nextStep.className}`}
                                                            >
                                                                {nextStep.label}
                                                            </Link>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">
                                                                —
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="px-5 py-4 text-right">
                                                        <Link
                                                            href={`/job-orders/${jobOrder.id}`}
                                                            className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-ustp-navy"
                                                        >
                                                            Open
                                                            <ArrowUpRight className="size-3.5" />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="space-y-3 md:hidden">
                                {jobOrders.data.map((jobOrder) => {
                                    const status =
                                        statusConfig[jobOrder.status] ??
                                        statusConfig.open;

                                    return (
                                        <Link
                                            key={jobOrder.id}
                                            href={`/job-orders/${jobOrder.id}`}
                                            className="block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                                        >
                                            <div className="flex items-center justify-between gap-3 p-3.5">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium text-slate-800">
                                                        {jobOrder.service_request.request_services
                                                            .map(
                                                                (item) =>
                                                                    item
                                                                        .service_type
                                                                        .service_name,
                                                            )
                                                            .join(', ')}
                                                    </p>
                                                    <p className="mt-0.5 truncate text-xs text-slate-400">
                                                        {
                                                            jobOrder
                                                                .service_request
                                                                .user.name
                                                        }
                                                    </p>
                                                </div>

                                                <span
                                                    className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${status.badge}`}
                                                >
                                                    {status.label}
                                                </span>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>

                            {jobOrders.last_page > 1 && (
                                <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row">
                                    <p className="text-xs text-slate-500">
                                        Showing {jobOrders.from ?? 0}–
                                        {jobOrders.to ?? 0} of {jobOrders.total}{' '}
                                        job orders
                                    </p>

                                    <div className="flex items-center gap-2">
                                        <Link
                                            href={
                                                jobOrders.links[0]?.url ?? '#'
                                            }
                                            preserveScroll
                                            className={`inline-flex size-9 items-center justify-center rounded-lg border ${
                                                jobOrders.links[0]?.url
                                                    ? 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                                    : 'pointer-events-none border-slate-100 bg-slate-50 text-slate-300'
                                            }`}
                                            aria-label="Previous page"
                                        >
                                            <ChevronLeft className="size-4" />
                                        </Link>

                                        <span className="text-xs text-slate-500">
                                            Page {jobOrders.current_page} of{' '}
                                            {jobOrders.last_page}
                                        </span>

                                        <Link
                                            href={
                                                jobOrders.links[
                                                    jobOrders.links.length - 1
                                                ]?.url ?? '#'
                                            }
                                            preserveScroll
                                            className={`inline-flex size-9 items-center justify-center rounded-lg border ${
                                                jobOrders.links[
                                                    jobOrders.links.length - 1
                                                ]?.url
                                                    ? 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                                    : 'pointer-events-none border-slate-100 bg-slate-50 text-slate-300'
                                            }`}
                                            aria-label="Next page"
                                        >
                                            <ChevronRight className="size-4" />
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
