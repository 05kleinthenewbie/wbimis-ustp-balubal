import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowUpRight,
    CheckCircle2,
    ClipboardList,
    Clock3,
    Search,
    Wrench,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

type JobOrderItem = {
    id: number;
    job_order_number: string;
    status: string;
    priority_level: string | null;
    replacement_due: boolean;
    date_assigned: string | null;
    sla_deadline: string | null;
    sla_status: string | null;
    service_request: {
        user: { name: string };
        request_services: { service_type: { service_name: string } }[];
    };
    technician: { name: string } | null;
};

type Props = {
    jobOrders: JobOrderItem[];
    stats: {
        active: number;
        in_progress: number;
        open: number;
        overdue: number;
    };
};

const statusConfig: Record<
    string,
    { label: string; badge: string; icon: typeof Wrench }
> = {
    open: {
        label: 'Open',
        badge: 'border-slate-200 bg-slate-50 text-slate-600',
        icon: Clock3,
    },
    in_progress: {
        label: 'In Progress',
        badge: 'border-amber-200 bg-amber-50 text-amber-700',
        icon: Wrench,
    },
};

const priorityBadge: Record<string, string> = {
    low: 'border-slate-200 bg-slate-50 text-slate-600',
    medium: 'border-sky-200 bg-sky-50 text-sky-700',
    high: 'border-orange-200 bg-orange-50 text-orange-600',
    urgent: 'border-red-200 bg-red-50 text-red-600',
};

export default function JobOrderProgress({ jobOrders, stats }: Props) {
    const [search, setSearch] = useState('');

    const query = search.trim().toLowerCase();
    const filtered = query
        ? jobOrders.filter(
              (jobOrder) =>
                  jobOrder.job_order_number.toLowerCase().includes(query) ||
                  jobOrder.service_request.user.name
                      .toLowerCase()
                      .includes(query) ||
                  (jobOrder.technician?.name ?? '')
                      .toLowerCase()
                      .includes(query),
          )
        : jobOrders;

    const inProgressPercent =
        stats.active > 0 ? (stats.in_progress / stats.active) * 100 : 0;

    return (
        <>
            <Head title="Work Progress" />

            <div className="min-h-full flex-1 bg-slate-50 text-slate-800">
                <div className="relative flex flex-1 flex-col gap-6 overflow-hidden p-4 md:p-6 lg:p-8">
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        {[
                            {
                                label: 'Active',
                                value: stats.active,
                                icon: ClipboardList,
                                color: 'text-ustp-navy',
                                bg: 'bg-ustp-navy/5',
                            },
                            {
                                label: 'In Progress',
                                value: stats.in_progress,
                                icon: Wrench,
                                color: 'text-amber-600',
                                bg: 'bg-amber-50',
                            },
                            {
                                label: 'Open',
                                value: stats.open,
                                icon: Clock3,
                                color: 'text-sky-600',
                                bg: 'bg-sky-50',
                            },
                            {
                                label: 'Past SLA',
                                value: stats.overdue,
                                icon: AlertTriangle,
                                color: 'text-rose-600',
                                bg: 'bg-rose-50',
                            },
                        ].map((card) => (
                            <div
                                key={card.label}
                                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`flex size-10 items-center justify-center rounded-xl ${card.bg}`}
                                    >
                                        <card.icon
                                            className={`size-5 ${card.color}`}
                                        />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-semibold text-slate-800">
                                            {card.value}
                                        </p>
                                        <p className="text-[11px] text-slate-400">
                                            {card.label}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {stats.active > 0 && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-slate-600">
                                    Work completion status
                                </p>
                                <p className="text-xs text-slate-400">
                                    {stats.in_progress} in progress ·{' '}
                                    {stats.open} open
                                </p>
                            </div>
                            <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className="bg-amber-400 transition-all"
                                    style={{ width: `${inProgressPercent}%` }}
                                />
                                <div className="flex-1 bg-slate-200" />
                            </div>
                        </div>
                    )}

                    <div className="relative max-w-md">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search job orders or technicians..."
                            className="h-10 border-slate-300 bg-white pr-9 pl-9 text-sm"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                aria-label="Clear search"
                                className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            >
                                <X className="size-3.5" />
                            </button>
                        )}
                    </div>

                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                            <CheckCircle2 className="size-10 text-emerald-300" />
                            <p className="mt-3 text-sm font-medium text-slate-600">
                                {jobOrders.length === 0
                                    ? 'No active job orders'
                                    : 'No matching job orders'}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                                {jobOrders.length === 0
                                    ? 'All assigned work has been completed.'
                                    : 'Try a different search term.'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="divide-y divide-slate-100">
                                {filtered.map((jobOrder) => {
                                    const status =
                                        statusConfig[jobOrder.status] ??
                                        statusConfig.open;
                                    const StatusIcon = status.icon;
                                    const overdue =
                                        jobOrder.sla_status === 'breached';

                                    return (
                                        <Link
                                            key={jobOrder.id}
                                            href={`/job-orders/${jobOrder.id}`}
                                            className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                                        >
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-mono text-xs font-semibold text-ustp-navy">
                                                        {
                                                            jobOrder.job_order_number
                                                        }
                                                    </span>
                                                    <span
                                                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${status.badge}`}
                                                    >
                                                        <StatusIcon className="size-3" />
                                                        {status.label}
                                                    </span>
                                                    <span
                                                        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${
                                                            priorityBadge[
                                                                jobOrder.priority_level ??
                                                                    ''
                                                            ] ??
                                                            'border-slate-200 bg-slate-50 text-slate-500'
                                                        }`}
                                                    >
                                                        {jobOrder.priority_level ??
                                                            'Normal'}
                                                    </span>
                                                    {overdue && (
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                                                            <AlertTriangle className="size-3" />
                                                            Past SLA
                                                        </span>
                                                    )}
                                                    {jobOrder.replacement_due && (
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                                            <AlertTriangle className="size-3" />
                                                            Replacement due
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-1.5 text-sm font-medium text-slate-700">
                                                    {
                                                        jobOrder.service_request
                                                            .user.name
                                                    }
                                                </p>
                                                <p className="truncate text-xs text-slate-400">
                                                    {jobOrder.service_request.request_services
                                                        .map(
                                                            (service) =>
                                                                service
                                                                    .service_type
                                                                    .service_name,
                                                        )
                                                        .join(', ') ||
                                                        'No service types listed'}
                                                </p>
                                            </div>

                                            <div className="flex items-center justify-between gap-6 sm:justify-end">
                                                <div className="text-left sm:text-right">
                                                    <p className="text-xs font-medium text-slate-600">
                                                        {jobOrder.technician
                                                            ?.name ??
                                                            'Unassigned'}
                                                    </p>
                                                    <p className="text-[11px] text-slate-400">
                                                        {jobOrder.date_assigned
                                                            ? `Assigned ${new Date(
                                                                  jobOrder.date_assigned,
                                                              ).toLocaleDateString(
                                                                  'en-US',
                                                                  {
                                                                      month: 'short',
                                                                      day: 'numeric',
                                                                  },
                                                              )}`
                                                            : 'Awaiting assignment'}
                                                    </p>
                                                </div>
                                                <ArrowUpRight className="size-4 shrink-0 text-slate-300" />
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
