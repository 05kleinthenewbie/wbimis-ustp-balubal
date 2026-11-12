import { Head, Link } from '@inertiajs/react';
import {
    ArrowUpRight,
    ClipboardList,
    Clock3,
    CheckCircle2,
    XCircle,
    Search,
    X,
    Plus,
    FileText,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type RequestService = {
    id: number;
    specification: string | null;
    quantity: number;
    action_type: string | null;
    service_type: {
        service_name: string;
        category: { category_name: string };
    };
};

type ServiceRequestItem = {
    id: number;
    problem_description: string;
    priority_level: string | null;
    request_status: string;
    date_requested: string;
    user: { name: string };
    request_services: RequestService[];
};

type Props = {
    requests: ServiceRequestItem[] | { data: ServiceRequestItem[] };
};

const statusConfig: Record<
    string,
    { badge: string; icon: typeof CheckCircle2 }
> = {
    pending: {
        badge: 'border-amber-200 bg-amber-50 text-amber-700',
        icon: Clock3,
    },
    approved: {
        badge: 'border-sky-200 bg-sky-50 text-sky-700',
        icon: CheckCircle2,
    },
    rejected: { badge: 'border-red-200 bg-red-50 text-red-600', icon: XCircle },
    completed: {
        badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        icon: CheckCircle2,
    },
};

const priorityBadge: Record<string, string> = {
    low: 'border-slate-200 bg-slate-50 text-slate-600',
    medium: 'border-blue-200 bg-blue-50 text-blue-700',
    high: 'border-orange-200 bg-orange-50 text-orange-600',
    urgent: 'border-red-200 bg-red-50 text-red-600',
};

export default function RequestsIndex({ requests }: Props) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const requestList = Array.isArray(requests)
        ? requests
        : (requests.data ?? []);

    const stats = {
        total: requestList.length,
        pending: requestList.filter((r) => r.request_status === 'pending')
            .length,
        approved: requestList.filter((r) => r.request_status === 'approved')
            .length,
        rejected: requestList.filter((r) => r.request_status === 'rejected')
            .length,
        completed: requestList.filter((r) => r.request_status === 'completed')
            .length,
    };

    const filteredRequests = requestList.filter((request) => {
        const query = search.toLowerCase();
        const matchesSearch =
            request.problem_description.toLowerCase().includes(query) ||
            request.user.name.toLowerCase().includes(query) ||
            request.request_services.some((service) =>
                service.service_type.service_name.toLowerCase().includes(query),
            ) ||
            String(request.id).includes(query);
        const matchesStatus =
            statusFilter === 'all' || request.request_status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const hasActiveFilter = statusFilter !== 'all' || search;

    return (
        <>
            <Head title="Service Requests" />

            <div className="min-h-full flex-1 bg-slate-50 text-slate-800">
                <div className="relative flex flex-1 flex-col gap-6 overflow-hidden p-4 md:p-6 lg:p-8">
                    <div className="flex justify-end">
                        <Button
                            asChild
                            className="h-10 bg-ustp-gold px-4 text-sm font-semibold text-ustp-navy shadow-lg shadow-ustp-gold/10 transition-all hover:bg-ustp-gold-dark hover:text-white"
                        >
                            <Link href="/requests/create">
                                <Plus className="mr-2 size-4" />
                                New Request
                            </Link>
                        </Button>
                    </div>

                    {/* Stats Cards */}
                    <div
                        role="group"
                        aria-label="Request status filters"
                        className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5"
                    >
                        {[
                            {
                                key: 'all',
                                label: 'Total Requests',
                                value: stats.total,
                                icon: FileText,
                                color: 'text-ustp-navy',
                                bg: 'bg-ustp-navy/5',
                            },
                            {
                                key: 'pending',
                                label: 'Pending',
                                value: stats.pending,
                                icon: Clock3,
                                color: 'text-amber-600',
                                bg: 'bg-amber-50',
                            },
                            {
                                key: 'approved',
                                label: 'Approved',
                                value: stats.approved,
                                icon: CheckCircle2,
                                color: 'text-sky-600',
                                bg: 'bg-sky-50',
                            },
                            {
                                key: 'completed',
                                label: 'Completed',
                                value: stats.completed,
                                icon: CheckCircle2,
                                color: 'text-emerald-600',
                                bg: 'bg-emerald-50',
                            },
                            {
                                key: 'rejected',
                                label: 'Rejected',
                                value: stats.rejected,
                                icon: XCircle,
                                color: 'text-red-600',
                                bg: 'bg-red-50',
                            },
                        ].map((card) => (
                            <button
                                key={card.key}
                                type="button"
                                aria-pressed={statusFilter === card.key}
                                onClick={() => setStatusFilter(card.key)}
                                className={`cursor-pointer rounded-xl border bg-white p-3 text-left shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ustp-navy ${
                                    statusFilter === card.key
                                        ? 'border-ustp-navy ring-1 ring-ustp-navy'
                                        : 'border-slate-200 hover:border-slate-400'
                                }`}
                            >
                                <span className="flex items-center gap-2.5">
                                    <span
                                        className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${card.bg}`}
                                    >
                                        <card.icon
                                            className={`size-4 ${card.color}`}
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <span>
                                        <span className="block text-xl font-semibold text-slate-800">
                                            {card.value}
                                        </span>
                                        <span className="block text-[11px] text-slate-400">
                                            {card.label}
                                        </span>
                                    </span>
                                </span>
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
                                placeholder="Search by ID, service, description, or user..."
                                className="h-10 border-slate-300 bg-white pl-9 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:border-ustp-light-blue focus-visible:ring-1 focus-visible:ring-ustp-light-blue/25"
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
                                {filteredRequests.length} request
                                {filteredRequests.length !== 1 ? 's' : ''}
                            </div>
                        </div>
                    </div>

                    {/* Empty */}
                    {filteredRequests.length === 0 ? (
                        <div className="relative flex min-h-90 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 text-center">
                            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-ustp-light-blue/10 text-ustp-light-blue">
                                <ClipboardList className="size-6" />
                            </div>

                            <h2 className="text-sm font-medium text-slate-800">
                                {hasActiveFilter
                                    ? 'No matching requests'
                                    : 'No service requests yet'}
                            </h2>

                            <p className="mt-1.5 max-w-sm text-xs leading-5 text-slate-400">
                                {hasActiveFilter
                                    ? 'Try adjusting your search or filter criteria.'
                                    : 'Submitted ICT service requests will appear here once they are created.'}
                            </p>

                            {!hasActiveFilter && (
                                <Button
                                    asChild
                                    variant="outline"
                                    className="mt-5 border-ustp-gold/30 bg-transparent text-ustp-gold hover:bg-ustp-gold/10 hover:text-ustp-gold"
                                >
                                    <Link href="/requests/create">
                                        <Plus className="size-4" />
                                        Create your first request
                                    </Link>
                                </Button>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table */}
                            <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
                                <table className="w-full text-sm">
                                    <thead className="border-b border-slate-200 bg-slate-50">
                                        <tr>
                                            <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                Request
                                            </th>
                                            <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                Submitted by
                                            </th>
                                            <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                Date
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
                                        {filteredRequests.map((request) => (
                                            <tr
                                                key={request.id}
                                                className="border-b border-slate-200 transition-colors last:border-0 hover:bg-slate-50"
                                            >
                                                <td className="px-5 py-4">
                                                    <div className="flex items-start gap-3">
                                                        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-ustp-light-blue/10 text-ustp-light-blue">
                                                            <ClipboardList className="size-4" />
                                                        </div>

                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono text-[10px] text-slate-400">
                                                                    #
                                                                    {request.id}
                                                                </span>
                                                            </div>

                                                            <p className="mt-0.5 truncate font-medium text-slate-800">
                                                                {request.request_services
                                                                    .map(
                                                                        (s) =>
                                                                            s
                                                                                .service_type
                                                                                .service_name,
                                                                    )
                                                                    .join(
                                                                        ', ',
                                                                    ) ||
                                                                    'Service request'}
                                                            </p>

                                                            <p className="mt-1 max-w-80 truncate text-xs text-slate-400">
                                                                {
                                                                    request.problem_description
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <span className="text-sm text-slate-600">
                                                        {request.user.name}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <span className="text-xs text-slate-500">
                                                        {new Date(
                                                            request.date_requested,
                                                        ).toLocaleDateString(
                                                            'en-US',
                                                            {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                year: 'numeric',
                                                            },
                                                        )}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <span
                                                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize ${priorityBadge[request.priority_level ?? ''] ?? 'border-slate-200 bg-slate-50 text-slate-500'}`}
                                                    >
                                                        {request.priority_level ??
                                                            'Not set'}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <span
                                                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize ${statusConfig[request.request_status]?.badge ?? 'border-slate-200 bg-slate-50 text-slate-500'}`}
                                                    >
                                                        {request.request_status}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4 text-right">
                                                    <Link
                                                        href={`/requests/${request.id}`}
                                                        className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-ustp-light-blue"
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
                                {filteredRequests.map((request) => (
                                    <Link
                                        key={request.id}
                                        href={`/requests/${request.id}`}
                                        className="block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                                    >
                                        <div className="p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex min-w-0 gap-3">
                                                    <div className="min-w-0">
                                                        <p className="truncate font-medium text-slate-800">
                                                            {request.request_services
                                                                .map(
                                                                    (s) =>
                                                                        s
                                                                            .service_type
                                                                            .service_name,
                                                                )
                                                                .join(', ') ||
                                                                'Service request'}
                                                        </p>
                                                        <p className="mt-0.5 text-xs text-slate-400">
                                                            #{request.id} ·{' '}
                                                            {request.user.name}
                                                        </p>
                                                    </div>
                                                </div>

                                                <span
                                                    className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${statusConfig[request.request_status]?.badge ?? 'border-slate-200 bg-slate-50 text-slate-500'}`}
                                                >
                                                    {request.request_status}
                                                </span>
                                            </div>

                                            <p className="mt-3 line-clamp-2 text-xs text-slate-400">
                                                {request.problem_description}
                                            </p>

                                            <div className="mt-3 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${priorityBadge[request.priority_level ?? ''] ?? 'border-slate-200 bg-slate-50 text-slate-500'}`}
                                                    >
                                                        {request.priority_level ??
                                                            'Not set'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-300">
                                                        ·
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                        {new Date(
                                                            request.date_requested,
                                                        ).toLocaleDateString(
                                                            'en-US',
                                                            {
                                                                month: 'short',
                                                                day: 'numeric',
                                                            },
                                                        )}
                                                    </span>
                                                </div>

                                                <ArrowUpRight className="size-4 text-slate-300" />
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
