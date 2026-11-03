import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowUpRight,
    CheckCircle2,
    Clock3,
    FileText,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type RequestService = {
    id: number;
    quantity: number;
    specification: string | null;
    service_type: {
        service_name: string;
        category: { category_name: string };
    };
};

type PendingRequest = {
    id: number;
    form_number: string | null;
    problem_description: string;
    priority_level: string | null;
    date_requested: string;
    user: { name: string; email: string };
    request_services: RequestService[];
};

type Props = {
    requests: PendingRequest[];
    stats: {
        pending: number;
        today: number;
        approved: number;
        rejected: number;
    };
};

const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
];

function PrioritySelect({
    value,
    onChange,
    disabled,
    className,
}: {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    className?: string;
}) {
    return (
        <Select value={value} onValueChange={onChange} disabled={disabled}>
            <SelectTrigger
                className={`h-9 border-slate-300 bg-white text-xs text-slate-700 ${className ?? ''}`}
            >
                <SelectValue placeholder="Select priority" />
            </SelectTrigger>

            <SelectContent className="border-slate-200 bg-white text-slate-800">
                {priorityOptions.map((option) => (
                    <SelectItem
                        key={option.value}
                        value={option.value}
                        className="text-xs"
                    >
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

export default function RequestApprovals({ requests, stats }: Props) {
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [priorities, setPriorities] = useState<Record<number, string>>({});

    const selectedPriority = (request: PendingRequest): string =>
        priorities[request.id] ?? request.priority_level ?? '';

    const decide = (
        request: PendingRequest,
        status: 'approved' | 'rejected',
    ) => {
        let rejectionReason: string | null = null;

        if (status === 'rejected') {
            rejectionReason = window.prompt(
                `Reason for rejecting ${request.user.name}'s request:`,
            );

            if (rejectionReason === null) {
                return;
            }
        }

        const priority = selectedPriority(request);

        if (status === 'approved' && priority === '') {
            return;
        }

        router.put(
            `/requests/${request.id}`,
            {
                request_status: status,
                ...(status === 'approved' ? { priority_level: priority } : {}),
                ...(rejectionReason
                    ? { rejection_reason: rejectionReason }
                    : {}),
            },
            {
                preserveScroll: true,
                onStart: () => setProcessingId(request.id),
                onFinish: () => setProcessingId(null),
            },
        );
    };

    return (
        <>
            <Head title="Request Approvals" />

            <div className="min-h-full flex-1 bg-slate-50 text-slate-800">
                <div className="relative flex flex-1 flex-col gap-6 overflow-hidden p-4 md:p-6 lg:p-8">
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        {[
                            {
                                label: 'Pending',
                                value: stats.pending,
                                icon: Clock3,
                                color: 'text-amber-600',
                                bg: 'bg-amber-50',
                            },
                            {
                                label: 'Submitted Today',
                                value: stats.today,
                                icon: FileText,
                                color: 'text-ustp-navy',
                                bg: 'bg-ustp-navy/5',
                            },
                            {
                                label: 'Approved',
                                value: stats.approved,
                                icon: CheckCircle2,
                                color: 'text-emerald-600',
                                bg: 'bg-emerald-50',
                            },
                            {
                                label: 'Rejected',
                                value: stats.rejected,
                                icon: XCircle,
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

                    {requests.length === 0 ? (
                        <div className="relative flex min-h-90 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 text-center">
                            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                                <CheckCircle2 className="size-6" />
                            </div>
                            <h2 className="text-sm font-medium text-slate-800">
                                No pending requests
                            </h2>
                            <p className="mt-1.5 max-w-sm text-xs leading-5 text-slate-400">
                                All service requests have been reviewed.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
                                <table className="w-full text-sm">
                                    <thead className="border-b border-slate-200 bg-slate-50">
                                        <tr>
                                            {[
                                                'Request',
                                                'Requested by',
                                                'Services',
                                                'Priority',
                                                'Actions',
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
                                        {requests.map((request) => (
                                            <tr
                                                key={request.id}
                                                className="border-b border-slate-200 transition-colors last:border-0 hover:bg-slate-50"
                                            >
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ustp-gold/10 text-ustp-gold">
                                                            <FileText className="size-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <Link
                                                                href={`/requests/${request.id}`}
                                                                className="font-medium text-slate-800 hover:text-ustp-navy"
                                                            >
                                                                {request.form_number ??
                                                                    `#${request.id}`}
                                                            </Link>
                                                            <p className="mt-0.5 line-clamp-2 max-w-xs text-xs text-slate-400">
                                                                {
                                                                    request.problem_description
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <p className="text-sm text-slate-700">
                                                        {request.user.name}
                                                    </p>
                                                    <p className="mt-0.5 text-xs text-slate-400">
                                                        {request.user.email}
                                                    </p>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="flex max-w-xs flex-wrap gap-1">
                                                        {request.request_services.map(
                                                            (service) => (
                                                                <span
                                                                    key={
                                                                        service.id
                                                                    }
                                                                    className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600"
                                                                >
                                                                    {
                                                                        service
                                                                            .service_type
                                                                            .service_name
                                                                    }
                                                                </span>
                                                            ),
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <PrioritySelect
                                                        value={selectedPriority(
                                                            request,
                                                        )}
                                                        onChange={(value) =>
                                                            setPriorities(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    [request.id]:
                                                                        value,
                                                                }),
                                                            )
                                                        }
                                                        disabled={
                                                            processingId ===
                                                            request.id
                                                        }
                                                        className="w-36"
                                                    />
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            disabled={
                                                                processingId ===
                                                                    request.id ||
                                                                selectedPriority(
                                                                    request,
                                                                ) === ''
                                                            }
                                                            title={
                                                                selectedPriority(
                                                                    request,
                                                                ) === ''
                                                                    ? 'Select a priority level first'
                                                                    : undefined
                                                            }
                                                            onClick={() =>
                                                                decide(
                                                                    request,
                                                                    'approved',
                                                                )
                                                            }
                                                            className="h-8 bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
                                                        >
                                                            <CheckCircle2 className="mr-1.5 size-3.5" />
                                                            Approve
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={
                                                                processingId ===
                                                                request.id
                                                            }
                                                            onClick={() =>
                                                                decide(
                                                                    request,
                                                                    'rejected',
                                                                )
                                                            }
                                                            className="h-8 border-rose-200 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                                                        >
                                                            <XCircle className="mr-1.5 size-3.5" />
                                                            Reject
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex flex-col gap-3 md:hidden">
                                {requests.map((request) => (
                                    <div
                                        key={request.id}
                                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <Link
                                                    href={`/requests/${request.id}`}
                                                    className="flex items-center gap-1 text-sm font-semibold text-ustp-navy"
                                                >
                                                    {request.form_number ??
                                                        `#${request.id}`}
                                                    <ArrowUpRight className="size-3.5" />
                                                </Link>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {request.user.name} ·{' '}
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
                                                </p>
                                            </div>
                                        </div>

                                        <p className="mt-3 text-sm text-slate-700">
                                            {request.problem_description}
                                        </p>

                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {request.request_services.map(
                                                (service) => (
                                                    <span
                                                        key={service.id}
                                                        className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600"
                                                    >
                                                        {
                                                            service.service_type
                                                                .service_name
                                                        }
                                                    </span>
                                                ),
                                            )}
                                        </div>

                                        <PrioritySelect
                                            value={selectedPriority(request)}
                                            onChange={(value) =>
                                                setPriorities((prev) => ({
                                                    ...prev,
                                                    [request.id]: value,
                                                }))
                                            }
                                            disabled={
                                                processingId === request.id
                                            }
                                            className="mt-4 w-full"
                                        />

                                        <div className="mt-3 flex items-center gap-2">
                                            <Button
                                                type="button"
                                                size="sm"
                                                disabled={
                                                    processingId ===
                                                        request.id ||
                                                    selectedPriority(
                                                        request,
                                                    ) === ''
                                                }
                                                title={
                                                    selectedPriority(
                                                        request,
                                                    ) === ''
                                                        ? 'Select a priority level first'
                                                        : undefined
                                                }
                                                onClick={() =>
                                                    decide(request, 'approved')
                                                }
                                                className="h-8 flex-1 bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
                                            >
                                                <CheckCircle2 className="mr-1.5 size-3.5" />
                                                Approve
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                disabled={
                                                    processingId === request.id
                                                }
                                                onClick={() =>
                                                    decide(request, 'rejected')
                                                }
                                                className="h-8 flex-1 border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                                            >
                                                <XCircle className="mr-1.5 size-3.5" />
                                                Reject
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
