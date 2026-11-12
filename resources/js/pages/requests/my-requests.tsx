import { Head, Link } from '@inertiajs/react';
import {
    ArrowUpRight,
    CheckCircle2,
    ClipboardList,
    Clock3,
    Plus,
    Search,
    X,
    XCircle,
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
    rejected: {
        badge: 'border-red-200 bg-red-50 text-red-600',
        icon: XCircle,
    },
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

const statusTabs = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'completed', label: 'Completed' },
    { key: 'rejected', label: 'Rejected' },
];

export default function MyRequestsIndex({ requests }: Props) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const requestList = Array.isArray(requests)
        ? requests
        : (requests.data ?? []);

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

    const hasActiveFilter = statusFilter !== 'all' || search.length > 0;

    return (
        <>
            <Head title="My Requests" />

            <div className="min-h-full flex-1 bg-slate-50 text-slate-800">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 md:px-6 lg:px-8">
                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                            <h2 className="text-lg font-semibold text-ustp-navy">
                                Request History
                            </h2>

                            <Button
                                asChild
                                className="h-10 rounded-xl bg-ustp-gold px-4 text-sm font-semibold text-ustp-navy shadow-sm transition-colors hover:bg-ustp-gold-dark hover:text-white"
                            >
                                <Link href="/requests/create">
                                    <Plus className="size-4" />
                                    New Request
                                </Link>
                            </Button>
                        </div>

                        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center">
                            <div className="relative w-full lg:max-w-md">
                                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />

                                <Input
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Search requests by service, description, or ID..."
                                    className="h-10 border-slate-300 bg-white pl-9 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:border-ustp-light-blue focus-visible:ring-1 focus-visible:ring-ustp-light-blue/25"
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

                            <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
                                {statusTabs.map((tab) => (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => setStatusFilter(tab.key)}
                                        className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                                            statusFilter === tab.key
                                                ? 'bg-ustp-navy text-white shadow-sm'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-ustp-navy'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {filteredRequests.length === 0 ? (
                            <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
                                <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-ustp-light-blue/10 text-ustp-light-blue">
                                    <ClipboardList className="size-6" />
                                </div>

                                <h3 className="text-sm font-medium text-slate-800">
                                    {hasActiveFilter
                                        ? 'No matching requests'
                                        : 'No requests yet'}
                                </h3>

                                <p className="mt-1.5 max-w-sm text-xs leading-5 text-slate-400">
                                    {hasActiveFilter
                                        ? 'Try adjusting your search or filter criteria.'
                                        : 'Your submitted ICT service requests will appear here.'}
                                </p>

                                {!hasActiveFilter && (
                                    <Button
                                        asChild
                                        variant="outline"
                                        className="mt-5 border-ustp-gold/30 bg-transparent text-ustp-gold-dark hover:bg-ustp-gold/10 hover:text-ustp-gold-dark"
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
                                <div className="hidden overflow-x-auto md:block">
                                    <table className="w-full text-sm">
                                        <thead className="border-b border-slate-200 bg-slate-50/70">
                                            <tr>
                                                <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                    Request
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
                                                    className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/70"
                                                >
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-start gap-3">
                                                            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-ustp-light-blue/10 text-ustp-light-blue">
                                                                <ClipboardList className="size-4" />
                                                            </div>

                                                            <div className="min-w-0">
                                                                <span className="font-mono text-[10px] text-slate-400">
                                                                    #
                                                                    {request.id}
                                                                </span>

                                                                <p className="mt-0.5 truncate font-medium text-slate-800">
                                                                    {request.request_services
                                                                        .map(
                                                                            (
                                                                                service,
                                                                            ) =>
                                                                                service
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
                                                            {
                                                                request.request_status
                                                            }
                                                        </span>
                                                    </td>

                                                    <td className="px-5 py-4 text-right">
                                                        <Link
                                                            href={`/requests/${request.id}`}
                                                            className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-ustp-navy"
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

                                <div className="space-y-3 p-4 md:hidden">
                                    {filteredRequests.map((request) => (
                                        <Link
                                            key={request.id}
                                            href={`/requests/${request.id}`}
                                            className="block overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-md"
                                        >
                                            <div className="p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex min-w-0 gap-3">
                                                        <div className="min-w-0">
                                                            <p className="truncate font-medium text-slate-800">
                                                                {request.request_services
                                                                    .map(
                                                                        (
                                                                            service,
                                                                        ) =>
                                                                            service
                                                                                .service_type
                                                                                .service_name,
                                                                    )
                                                                    .join(
                                                                        ', ',
                                                                    ) ||
                                                                    'Service request'}
                                                            </p>
                                                            <p className="mt-0.5 text-xs text-slate-400">
                                                                #{request.id} ·{' '}
                                                                {
                                                                    request.user
                                                                        .name
                                                                }
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
                                                    {
                                                        request.problem_description
                                                    }
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
                    </section>
                </div>
            </div>
        </>
    );
}
