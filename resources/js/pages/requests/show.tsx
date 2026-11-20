import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowUpRight,
    CalendarDays,
    Check,
    CheckCircle2,
    Circle,
    ClipboardList,
    Clock3,
    Download,
    FileText,
    Mail,
    MessageSquare,
    Phone,
    UserRound,
    Wrench,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { BackButton } from '@/components/back-button';
import { Badge } from '@/components/ui/badge';
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
    specification: string | null;
    quantity: number;
    action_type: string | null;
    service_type: {
        service_name: string;
        category: { category_name: string };
    };
};

type Attachment = {
    id: number;
    file_name: string;
    uploaded_at: string | null;
};

type ServiceRequestDetail = {
    id: number;
    form_number: string | null;
    problem_description: string;
    priority_level: string | null;
    request_status: string;
    date_requested: string;
    location: string | null;
    contact_details: string | null;
    rejection_reason: string | null;
    sla_deadline: string | null;
    sla_status: string | null;
    user: { name: string; department: string | null };
    request_services: RequestService[];
    attachments: Attachment[];
};

type JobOrderTechnician = {
    name: string;
    department: string | null;
    position: string | null;
    expertise: string | null;
    contact_no: string | null;
    email: string | null;
};

type JobOrderResponse = {
    id: number;
    response_type: string;
    response_report: string;
    time_spent_minutes: number | null;
    date_responded: string | null;
    date_resolved: string | null;
    technician: { name: string };
};

type JobOrderSummary = {
    id: number;
    job_order_number: string | null;
    status: string;
    date_assigned: string | null;
    date_in_progress: string | null;
    date_completed: string | null;
    technician: JobOrderTechnician | null;
    technician_responses: JobOrderResponse[];
};

type Props = {
    request: ServiceRequestDetail;
    isAdmin: boolean;
    jobOrder: JobOrderSummary | null;
};

const statusConfig: Record<
    string,
    {
        label: string;
        color: string;
        bg: string;
        border: string;
        icon: React.ReactNode;
    }
> = {
    pending: {
        label: 'Pending',
        color: 'text-amber-700',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        icon: <Clock3 className="size-5" />,
    },
    approved: {
        label: 'Approved',
        color: 'text-emerald-700',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        icon: <CheckCircle2 className="size-5" />,
    },
    rejected: {
        label: 'Rejected',
        color: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200',
        icon: <X className="size-5" />,
    },
    completed: {
        label: 'Completed',
        color: 'text-sky-700',
        bg: 'bg-sky-50',
        border: 'border-sky-200',
        icon: <CheckCircle2 className="size-5" />,
    },
};

const priorityConfig: Record<
    string,
    { label: string; color: string; bg: string }
> = {
    low: { label: 'Low', color: 'text-slate-600', bg: 'bg-slate-100' },
    medium: { label: 'Medium', color: 'text-blue-700', bg: 'bg-blue-50' },
    high: { label: 'High', color: 'text-orange-600', bg: 'bg-orange-50' },
    urgent: { label: 'Urgent', color: 'text-red-600', bg: 'bg-red-50' },
};

const jobOrderStatusConfig: Record<
    string,
    { label: string; className: string }
> = {
    open: {
        label: 'Awaiting assignment',
        className: 'border-amber-200 bg-amber-50 text-amber-700',
    },
    in_progress: {
        label: 'In progress',
        className: 'border-sky-200 bg-sky-50 text-sky-700',
    },
    completed: {
        label: 'For verification',
        className: 'border-violet-200 bg-violet-50 text-violet-700',
    },
    closed: {
        label: 'Completed',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
};

const responseTypeConfig: Record<string, { label: string; className: string }> =
    {
        progress: {
            label: 'Progress update',
            className: 'border-sky-200 bg-sky-50 text-sky-700',
        },
        finding: {
            label: 'Findings',
            className: 'border-amber-200 bg-amber-50 text-amber-700',
        },
        resolution: {
            label: 'Resolution',
            className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        },
    };

const statusSteps = ['pending', 'approved', 'completed'];

export default function RequestsShow({ request, isAdmin, jobOrder }: Props) {
    const [priority, setPriority] = useState(request.priority_level ?? '');
    const [processing, setProcessing] = useState(false);

    function updateStatus(status: string) {
        setProcessing(true);
        router.put(
            `/requests/${request.id}`,
            {
                request_status: status,
                priority_level: priority || null,
            },
            {
                onFinish: () => setProcessing(false),
            },
        );
    }

    const statusConfig_ =
        statusConfig[request.request_status] || statusConfig.pending;
    const priorityConfig_ = request.priority_level
        ? priorityConfig[request.priority_level]
        : null;
    const currentStepIndex = statusSteps.indexOf(request.request_status);

    return (
        <>
            <Head title={`Request #${request.id}`} />

            <div className="relative min-h-full flex-1 overflow-hidden bg-slate-50 px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
                <div className="relative mx-auto max-w-4xl space-y-6">
                    <div className="flex justify-end">
                        <BackButton href="/requests" />
                    </div>

                    {/* Header */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                            <div className="flex gap-4">
                                <div
                                    className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${statusConfig_.bg} ${statusConfig_.color}`}
                                >
                                    {statusConfig_.icon}
                                </div>

                                <div>
                                    <div className="mb-1 flex items-center gap-2">
                                        <span className="font-mono text-[10px] text-slate-400">
                                            {request.form_number ||
                                                `REQUEST #${request.id}`}
                                        </span>
                                        <span className="size-1 rounded-full bg-slate-300" />
                                        <span className="text-[10px] tracking-wider text-slate-400 uppercase">
                                            ICT Service
                                        </span>
                                    </div>

                                    <h2 className="text-xl font-semibold tracking-tight text-slate-800 md:text-2xl">
                                        {request.request_services
                                            .map(
                                                (s) =>
                                                    s.service_type.service_name,
                                            )
                                            .join(', ') || 'Service request'}
                                    </h2>

                                    <p className="mt-1.5 text-xs text-slate-400">
                                        Submitted{' '}
                                        {new Date(
                                            request.date_requested,
                                        ).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <Badge
                                variant="outline"
                                className={`w-fit rounded-lg px-3 py-1 text-[10px] font-medium capitalize ${statusConfig_.border} ${statusConfig_.bg} ${statusConfig_.color}`}
                            >
                                {statusConfig_.label}
                            </Badge>
                        </div>
                    </div>

                    {/* Timeline Progress */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                        <p className="mb-4 text-sm font-semibold text-slate-800">
                            Request Progress
                        </p>

                        <div className="flex items-center justify-between">
                            {statusSteps.map((step, index) => {
                                const stepConfig = statusConfig[step];
                                const isCompleted = index <= currentStepIndex;
                                const isCurrent = index === currentStepIndex;

                                return (
                                    <div
                                        key={step}
                                        className="flex flex-1 items-center"
                                    >
                                        <div className="flex flex-col items-center">
                                            <div
                                                className={`flex size-10 items-center justify-center rounded-full border-2 transition-all ${
                                                    isCompleted
                                                        ? `${stepConfig.border} ${stepConfig.bg} ${stepConfig.color}`
                                                        : 'border-slate-200 bg-slate-50 text-slate-400'
                                                } ${isCurrent ? 'ring-2 ring-offset-2 ring-offset-white ' + stepConfig.border : ''}`}
                                            >
                                                {isCompleted ? (
                                                    <CheckCircle2 className="size-5" />
                                                ) : (
                                                    <Circle className="size-5" />
                                                )}
                                            </div>

                                            <span
                                                className={`mt-2 text-[10px] font-medium ${isCompleted ? stepConfig.color : 'text-slate-400'}`}
                                            >
                                                {stepConfig.label}
                                            </span>
                                        </div>

                                        {index < statusSteps.length - 1 && (
                                            <div
                                                className={`mx-2 h-0.5 flex-1 ${index < currentStepIndex ? 'bg-ustp-gold' : 'bg-slate-200'}`}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Assigned technician */}
                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-4 md:px-6">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ustp-gold/10 text-ustp-gold">
                                <Wrench className="size-4" />
                            </div>

                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800">
                                    Assigned technician
                                </p>
                                <p className="mt-0.5 text-[11px] text-slate-400">
                                    {jobOrder?.job_order_number
                                        ? `Job order #${jobOrder.job_order_number}`
                                        : 'Personnel handling this request.'}
                                </p>
                            </div>

                            {jobOrder && (
                                <span
                                    className={`ml-auto inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${jobOrderStatusConfig[jobOrder.status]?.className ?? 'border-slate-200 bg-slate-50 text-slate-500'}`}
                                >
                                    {jobOrderStatusConfig[jobOrder.status]
                                        ?.label ??
                                        jobOrder.status.replace('_', ' ')}
                                </span>
                            )}
                        </div>

                        <div className="p-5 md:p-6">
                            {jobOrder?.technician ? (
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ustp-navy text-sm font-semibold text-white">
                                            {jobOrder.technician.name
                                                .split(' ')
                                                .filter(Boolean)
                                                .slice(0, 2)
                                                .map((part) => part[0])
                                                .join('')
                                                .toUpperCase()}
                                        </div>

                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-slate-800">
                                                {jobOrder.technician.name}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {jobOrder.technician
                                                    .expertise ??
                                                    jobOrder.technician
                                                        .position ??
                                                    'ICT Technician'}
                                            </p>
                                            {jobOrder.technician.department && (
                                                <p className="mt-0.5 text-[11px] text-slate-400">
                                                    {
                                                        jobOrder.technician
                                                            .department
                                                    }
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1.5 text-xs text-slate-500 sm:items-end sm:text-right">
                                        {jobOrder.technician.contact_no && (
                                            <a
                                                href={`tel:${jobOrder.technician.contact_no}`}
                                                className="inline-flex items-center gap-1.5 transition-colors hover:text-ustp-navy"
                                            >
                                                <Phone className="size-3.5 text-slate-400" />
                                                {jobOrder.technician.contact_no}
                                            </a>
                                        )}

                                        {jobOrder.technician.email && (
                                            <a
                                                href={`mailto:${jobOrder.technician.email}`}
                                                className="inline-flex items-center gap-1.5 break-all transition-colors hover:text-ustp-navy"
                                            >
                                                <Mail className="size-3.5 text-slate-400" />
                                                {jobOrder.technician.email}
                                            </a>
                                        )}

                                        {jobOrder.date_assigned && (
                                            <span className="inline-flex items-center gap-1.5">
                                                <CalendarDays className="size-3.5 text-slate-400" />
                                                Assigned{' '}
                                                {new Date(
                                                    jobOrder.date_assigned,
                                                ).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                                    <p className="text-sm font-medium text-slate-700">
                                        {jobOrder
                                            ? 'No technician assigned yet'
                                            : 'Awaiting request approval'}
                                    </p>
                                    <p className="mt-1 text-xs leading-5 text-slate-500">
                                        {jobOrder
                                            ? 'The ICT office will assign a technician to handle this request.'
                                            : 'A technician will be assigned after the ICT office approves your request.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Technician responses */}
                    {jobOrder && (
                        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-4 md:px-6">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ustp-gold/10 text-ustp-gold">
                                    <MessageSquare className="size-4" />
                                </div>

                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-800">
                                        Technician updates
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-slate-400">
                                        Findings, progress, and feedback from
                                        the technician handling your request.
                                    </p>
                                </div>

                                <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-slate-500">
                                    {jobOrder.technician_responses.length}{' '}
                                    {jobOrder.technician_responses.length === 1
                                        ? 'update'
                                        : 'updates'}
                                </span>
                            </div>

                            <div className="p-5 md:p-6">
                                {jobOrder.technician_responses.length > 0 ? (
                                    <ol className="relative flex flex-col gap-4 border-l border-slate-200 pl-5">
                                        {jobOrder.technician_responses.map(
                                            (response) => {
                                                const typeConfig =
                                                    responseTypeConfig[
                                                        response.response_type
                                                    ];

                                                return (
                                                    <li
                                                        key={response.id}
                                                        className="relative rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                                                    >
                                                        <span className="absolute top-5 -left-[27px] size-2.5 rounded-full border-2 border-white bg-ustp-gold" />

                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span
                                                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${typeConfig?.className ?? 'border-slate-200 bg-white text-slate-500'}`}
                                                            >
                                                                {typeConfig?.label ??
                                                                    response.response_type.replace(
                                                                        '_',
                                                                        ' ',
                                                                    )}
                                                            </span>

                                                            <span className="text-[11px] font-medium text-slate-600">
                                                                {
                                                                    response
                                                                        .technician
                                                                        .name
                                                                }
                                                            </span>

                                                            {response.date_responded && (
                                                                <span className="text-[10px] text-slate-400">
                                                                    {new Date(
                                                                        response.date_responded,
                                                                    ).toLocaleString()}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-slate-600">
                                                            {
                                                                response.response_report
                                                            }
                                                        </p>

                                                        <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
                                                            {response.time_spent_minutes !==
                                                                null && (
                                                                <span>
                                                                    Time spent:{' '}
                                                                    {
                                                                        response.time_spent_minutes
                                                                    }{' '}
                                                                    min
                                                                </span>
                                                            )}

                                                            {response.date_resolved && (
                                                                <span>
                                                                    Resolved{' '}
                                                                    {new Date(
                                                                        response.date_resolved,
                                                                    ).toLocaleDateString()}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </li>
                                                );
                                            },
                                        )}
                                    </ol>
                                ) : (
                                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                                        <p className="text-sm font-medium text-slate-700">
                                            No technician updates yet
                                        </p>
                                        <p className="mt-1 text-xs leading-5 text-slate-500">
                                            Progress notes, findings, and
                                            feedback will appear here once the
                                            technician posts an update.
                                        </p>
                                    </div>
                                )}

                                <div className="mt-4 flex justify-end">
                                    <Link
                                        href={`/job-orders/${jobOrder.id}`}
                                        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-ustp-navy"
                                    >
                                        Open full job order
                                        <ArrowUpRight className="size-3.5" />
                                    </Link>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Request metadata */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="mb-3 flex size-8 items-center justify-center rounded-lg bg-ustp-gold/10 text-ustp-gold">
                                <UserRound className="size-4" />
                            </div>
                            <p className="text-[10px] font-medium tracking-wider text-slate-400 uppercase">
                                Requested by
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-800">
                                {request.user.name}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-400">
                                {request.user.department ?? 'No department'}
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="mb-3 flex size-8 items-center justify-center rounded-lg bg-ustp-gold/10 text-ustp-gold">
                                <Clock3 className="size-4" />
                            </div>
                            <p className="text-[10px] font-medium tracking-wider text-slate-400 uppercase">
                                Date requested
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-800">
                                {new Date(
                                    request.date_requested,
                                ).toLocaleDateString()}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-400">
                                {new Date(
                                    request.date_requested,
                                ).toLocaleTimeString([], {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                })}
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <div
                                className={`mb-3 flex size-8 items-center justify-center rounded-lg ${priorityConfig_?.bg || 'bg-slate-50'} ${priorityConfig_?.color || 'text-slate-400'}`}
                            >
                                <AlertTriangle className="size-4" />
                            </div>
                            <p className="text-[10px] font-medium tracking-wider text-slate-400 uppercase">
                                Priority
                            </p>
                            <p
                                className={`mt-1 text-sm font-medium capitalize ${priorityConfig_?.color || 'text-slate-400'}`}
                            >
                                {request.priority_level ?? 'Not set yet'}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-400">
                                Assigned by ICT Admin
                            </p>
                        </div>
                    </div>

                    {/* SLA Status, Location, and Contact */}
                    <div className="grid gap-4 md:grid-cols-3">
                        {request.sla_deadline && (
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="mb-3 flex size-8 items-center justify-center rounded-lg bg-ustp-gold/10 text-ustp-gold">
                                    <Clock3 className="size-4" />
                                </div>
                                <p className="text-[10px] font-medium tracking-wider text-slate-400 uppercase">
                                    SLA Deadline
                                </p>
                                <p className="mt-1 text-sm font-medium text-slate-800">
                                    {new Date(
                                        request.sla_deadline,
                                    ).toLocaleString()}
                                </p>
                                <p
                                    className={`mt-0.5 text-xs capitalize ${
                                        request.sla_status === 'breached'
                                            ? 'text-red-600'
                                            : request.sla_status === 'at_risk'
                                              ? 'text-amber-700'
                                              : 'text-emerald-700'
                                    }`}
                                >
                                    {request.sla_status === 'breached'
                                        ? 'SLA Breached'
                                        : request.sla_status === 'at_risk'
                                          ? 'At Risk'
                                          : 'On Track'}
                                </p>
                            </div>
                        )}

                        {request.location && (
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="mb-3 flex size-8 items-center justify-center rounded-lg bg-ustp-gold/10 text-ustp-gold">
                                    <FileText className="size-4" />
                                </div>
                                <p className="text-[10px] font-medium tracking-wider text-slate-400 uppercase">
                                    Location
                                </p>
                                <p className="mt-1 text-sm font-medium text-slate-800">
                                    {request.location}
                                </p>
                            </div>
                        )}

                        {request.contact_details && (
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="mb-3 flex size-8 items-center justify-center rounded-lg bg-ustp-gold/10 text-ustp-gold">
                                    <FileText className="size-4" />
                                </div>
                                <p className="text-[10px] font-medium tracking-wider text-slate-400 uppercase">
                                    Contact Details
                                </p>
                                <p className="mt-1 text-sm font-medium text-slate-800">
                                    {request.contact_details}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Services */}
                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 md:px-6">
                            <div>
                                <p className="text-sm font-semibold text-slate-800">
                                    Services requested
                                </p>
                                <p className="mt-0.5 text-[11px] text-slate-400">
                                    Services and specifications included in this
                                    request.
                                </p>
                            </div>
                        </div>

                        <div className="divide-y divide-slate-200">
                            {request.request_services.map((service) => (
                                <div
                                    key={service.id}
                                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex size-8 items-center justify-center rounded-lg bg-ustp-gold/10 text-ustp-gold">
                                            <ClipboardList className="size-4" />
                                        </div>

                                        <div>
                                            <p className="text-sm font-medium text-slate-800">
                                                {
                                                    service.service_type
                                                        .service_name
                                                }
                                            </p>
                                            <p className="mt-0.5 text-[10px] tracking-wider text-slate-400 uppercase">
                                                {
                                                    service.service_type
                                                        .category.category_name
                                                }
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 text-xs">
                                        {service.specification && (
                                            <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-500">
                                                {service.specification}
                                            </span>
                                        )}

                                        <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-500">
                                            Qty: {service.quantity}
                                        </span>

                                        {service.action_type && (
                                            <span className="rounded-lg border border-ustp-gold/30 bg-ustp-gold/10 px-2.5 py-1 text-ustp-gold">
                                                {service.action_type}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Problem */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                        <div className="flex items-center gap-3">
                            <p className="text-sm font-semibold text-slate-800">
                                Problem description
                            </p>
                        </div>

                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-sm leading-6 whitespace-pre-wrap text-slate-600">
                                {request.problem_description}
                            </p>
                        </div>
                    </section>

                    {/* Attachments */}
                    {request.attachments.length > 0 && (
                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                            <div className="flex items-center gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">
                                        Attachments
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-slate-400">
                                        {request.attachments.length} file
                                        {request.attachments.length !== 1
                                            ? 's'
                                            : ''}{' '}
                                        uploaded
                                    </p>
                                </div>
                            </div>

                            <ul className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                                {request.attachments.map((attachment) => (
                                    <li
                                        key={attachment.id}
                                        className="flex items-center justify-between gap-3 bg-slate-50/60 px-4 py-3"
                                    >
                                        <span className="flex min-w-0 items-center gap-2 text-xs text-slate-600">
                                            <FileText className="size-4 shrink-0 text-slate-400" />
                                            <span className="truncate">
                                                {attachment.file_name}
                                            </span>
                                        </span>

                                        <a
                                            href={`/attachments/${attachment.id}/download`}
                                            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:border-ustp-gold/40 hover:text-ustp-gold"
                                        >
                                            <Download className="size-3" />
                                            Download
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {/* Rejection reason */}
                    {request.request_status === 'rejected' &&
                        request.rejection_reason && (
                            <section className="rounded-2xl border border-red-200 bg-red-50 p-5 md:p-6">
                                <div className="flex items-center gap-2">
                                    <X className="size-4 text-red-600" />
                                    <p className="text-sm font-medium text-red-600">
                                        Rejection Reason
                                    </p>
                                </div>

                                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                                    <p className="text-sm leading-6 whitespace-pre-wrap text-red-700">
                                        {request.rejection_reason}
                                    </p>
                                </div>
                            </section>
                        )}

                    {/* Admin review */}
                    {isAdmin && request.request_status === 'pending' && (
                        <section className="overflow-hidden rounded-2xl border border-ustp-gold/30 bg-white shadow-sm">
                            <div className="flex items-center gap-3 border-b border-slate-200 bg-ustp-gold/4 px-5 py-4 md:px-6">
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">
                                        Review request
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-slate-400">
                                        Set the request priority before
                                        approving or rejecting it.
                                    </p>
                                </div>
                            </div>

                            <div className="p-5 md:p-6">
                                <div className="max-w-sm">
                                    <label className="mb-2 block text-xs font-medium text-slate-600">
                                        Priority
                                    </label>

                                    <Select
                                        value={priority}
                                        onValueChange={setPriority}
                                    >
                                        <SelectTrigger className="h-10 w-full border-slate-300 bg-white text-slate-800 focus:ring-1 focus:ring-ustp-gold/30">
                                            <SelectValue placeholder="Select priority" />
                                        </SelectTrigger>
                                        <SelectContent className="border-slate-200 bg-white text-slate-800">
                                            <SelectItem value="low">
                                                Low
                                            </SelectItem>
                                            <SelectItem value="medium">
                                                Medium
                                            </SelectItem>
                                            <SelectItem value="high">
                                                High
                                            </SelectItem>
                                            <SelectItem value="urgent">
                                                Urgent
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                    <Button
                                        variant="outline"
                                        disabled={processing}
                                        onClick={() => updateStatus('rejected')}
                                        className="border-red-200 bg-transparent text-red-600 hover:bg-red-50 hover:text-red-700"
                                    >
                                        <X className="size-4" />
                                        Reject
                                    </Button>

                                    <Button
                                        disabled={processing || priority === ''}
                                        title={
                                            priority === ''
                                                ? 'Select a priority level first'
                                                : undefined
                                        }
                                        onClick={() => updateStatus('approved')}
                                        className="bg-ustp-gold text-ustp-navy hover:bg-ustp-gold-dark hover:text-white"
                                    >
                                        <Check className="size-4" />
                                        Approve Request
                                    </Button>
                                </div>
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </>
    );
}
