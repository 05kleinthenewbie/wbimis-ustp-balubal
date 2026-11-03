import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowUpRight,
    CheckCircle2,
    ClipboardList,
    Clock3,
    Search,
    UserCog,
    UserPlus,
    UserRound,
    Wrench,
    X,
} from 'lucide-react';
import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type JobOrderItem = {
    id: number;
    job_order_number: string;
    status: string;
    priority_level: string | null;
    date_assigned: string | null;
    service_request: {
        id: number;
        user: { name: string };
        request_services: { service_type: { service_name: string } }[];
    };
    technician: { id: number; name: string } | null;
};

type Technician = {
    id: number;
    name: string;
    department: string | null;
    expertise?: string | null;
    contact_no?: string | null;
};

type Group = {
    technician: Technician;
    job_orders: JobOrderItem[];
};

type Stats = {
    technicians: number;
    assigned: number;
    unassigned: number;
    active: number;
};

type Props = {
    groups: Group[];
    unassigned: JobOrderItem[];
    technicians: Technician[];
    stats: Stats;
};

const NONE_VALUE = 'none';

const statusConfig: Record<
    string,
    { label: string; badge: string; icon: typeof CheckCircle2 }
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
    completed: {
        label: 'Completed',
        badge: 'border-sky-200 bg-sky-50 text-sky-700',
        icon: CheckCircle2,
    },
    closed: {
        label: 'Closed',
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

function JobOrderRow({
    jobOrder,
    onAssign,
}: {
    jobOrder: JobOrderItem;
    onAssign: (jobOrder: JobOrderItem) => void;
}) {
    const status = statusConfig[jobOrder.status] ?? statusConfig.open;
    const StatusIcon = status.icon;
    const assigned = Boolean(jobOrder.technician);
    const priority =
        priorityConfig[jobOrder.priority_level ?? 'medium'] ??
        priorityConfig.medium;

    return (
        <div className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-slate-50">
            <Link
                href={`/job-orders/${jobOrder.id}`}
                className="flex min-w-0 flex-1 items-start justify-between gap-3"
            >
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-ustp-navy">
                            {jobOrder.job_order_number}
                        </span>
                        <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${status.badge}`}
                        >
                            <StatusIcon className="size-3" />
                            {status.label}
                        </span>
                        <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${priority.badge}`}
                        >
                            {priority.label}
                        </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-700">
                        {jobOrder.service_request.user.name}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                        {jobOrder.service_request.request_services
                            .map((service) => service.service_type.service_name)
                            .join(', ') || 'No service types listed'}
                    </p>
                </div>
                <ArrowUpRight className="mt-1 size-4 shrink-0 text-slate-300" />
            </Link>

            <button
                type="button"
                onClick={() => onAssign(jobOrder)}
                aria-label={
                    assigned
                        ? `Change technician for job order ${jobOrder.job_order_number}`
                        : `Add technician to job order ${jobOrder.job_order_number}`
                }
                className={`mt-0.5 inline-flex max-w-47.5 shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                    assigned
                        ? 'border-slate-200 bg-white text-slate-600 hover:border-ustp-navy/40 hover:text-ustp-navy'
                        : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
            >
                {assigned ? (
                    <UserRound className="size-3.5 shrink-0" />
                ) : (
                    <UserPlus className="size-3.5 shrink-0" />
                )}
                <span className="truncate">
                    {jobOrder.technician?.name ?? 'Add technician'}
                </span>
            </button>
        </div>
    );
}

function StatCard({
    label,
    value,
    icon: Icon,
    color,
    bg,
    onClick,
}: {
    label: string;
    value: number;
    icon: typeof ClipboardList;
    color: string;
    bg: string;
    onClick?: () => void;
}) {
    const content = (
        <div className="flex items-center gap-3">
            <div
                className={`flex size-10 items-center justify-center rounded-xl ${bg}`}
            >
                <Icon className={`size-5 ${color}`} />
            </div>
            <div>
                <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                    {label}
                </p>
                <p className="text-xl font-semibold text-slate-800">{value}</p>
            </div>
        </div>
    );

    const cardClass = `rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm${onClick ? ' w-full cursor-pointer transition hover:border-ustp-navy/30 hover:shadow-md' : ''}`;

    return onClick ? (
        <button type="button" onClick={onClick} className={cardClass}>
            {content}
        </button>
    ) : (
        <div className={cardClass}>{content}</div>
    );
}

export default function JobOrderAssignments({
    groups,
    unassigned,
    technicians,
    stats,
}: Props) {
    const [search, setSearch] = useState('');
    const [assignTarget, setAssignTarget] = useState<JobOrderItem | null>(null);
    const [selectedTechnician, setSelectedTechnician] = useState(NONE_VALUE);
    const [submitting, setSubmitting] = useState(false);
    const [assignError, setAssignError] = useState<string | null>(null);

    const [techDialogOpen, setTechDialogOpen] = useState(false);
    const [techView, setTechView] = useState<'list' | 'add'>('list');
    const [techForm, setTechForm] = useState({
        name: '',
        contact_no: '',
        expertise: '',
        email: '',
    });
    const [techErrors, setTechErrors] = useState<Record<string, string>>({});
    const [techSubmitting, setTechSubmitting] = useState(false);

    function openTechDialog(view: 'list' | 'add') {
        setTechView(view);
        setTechForm({ name: '', contact_no: '', expertise: '', email: '' });
        setTechErrors({});
        setTechDialogOpen(true);
    }

    function submitTechnician() {
        setTechSubmitting(true);
        setTechErrors({});

        router.post(
            '/technicians',
            {
                name: techForm.name,
                contact_no: techForm.contact_no || null,
                expertise: techForm.expertise || null,
                email: techForm.email || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setTechView('list');
                    setTechForm({
                        name: '',
                        contact_no: '',
                        expertise: '',
                        email: '',
                    });
                    router.reload({
                        only: ['technicians', 'groups', 'stats'],
                    });
                },
                onError: (errors) => setTechErrors(errors),
                onFinish: () => setTechSubmitting(false),
            },
        );
    }

    function openAssignDialog(jobOrder: JobOrderItem) {
        setAssignTarget(jobOrder);
        setSelectedTechnician(
            jobOrder.technician ? String(jobOrder.technician.id) : NONE_VALUE,
        );
        setAssignError(null);
    }

    function closeAssignDialog() {
        setAssignTarget(null);
        setAssignError(null);
    }

    function submitAssignment() {
        if (!assignTarget) {
            return;
        }

        const removing =
            selectedTechnician === NONE_VALUE && !assignTarget.technician;

        if (removing) {
            closeAssignDialog();

            return;
        }

        setSubmitting(true);
        setAssignError(null);

        router.put(
            `/job-orders/${assignTarget.id}/assign`,
            {
                assigned_to:
                    selectedTechnician === NONE_VALUE
                        ? null
                        : selectedTechnician,
            },
            {
                preserveScroll: true,
                onSuccess: () => closeAssignDialog(),
                onError: (errors) =>
                    setAssignError(
                        errors.assigned_to ??
                            'Unable to update the technician. Please try again.',
                    ),
                onFinish: () => setSubmitting(false),
            },
        );
    }

    const query = search.trim().toLowerCase();
    const filteredGroups = groups
        .map((group) => ({
            ...group,
            job_orders: query
                ? group.job_orders.filter(
                      (jobOrder) =>
                          jobOrder.job_order_number
                              .toLowerCase()
                              .includes(query) ||
                          jobOrder.service_request.user.name
                              .toLowerCase()
                              .includes(query),
                  )
                : group.job_orders,
        }))
        .filter(
            (group) =>
                !query ||
                group.technician.name.toLowerCase().includes(query) ||
                group.job_orders.length > 0,
        );

    const filteredUnassigned = query
        ? unassigned.filter(
              (jobOrder) =>
                  jobOrder.job_order_number.toLowerCase().includes(query) ||
                  jobOrder.service_request.user.name
                      .toLowerCase()
                      .includes(query),
          )
        : unassigned;

    const hasResults =
        filteredGroups.length > 0 || filteredUnassigned.length > 0;

    return (
        <>
            <Head title="Job Order Assignments" />

            <div className="min-h-full flex-1 bg-slate-50 text-slate-800">
                <div className="relative flex flex-1 flex-col gap-6 overflow-hidden p-4 md:p-6 lg:p-8">
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => openTechDialog('add')}
                            className="inline-flex h-10 items-center gap-2 rounded-lg bg-ustp-navy px-4 text-sm font-medium text-white shadow-sm transition hover:bg-ustp-navy-light"
                        >
                            <UserPlus className="size-4" />
                            Add technician
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        <StatCard
                            label="Technicians"
                            value={stats.technicians}
                            icon={UserCog}
                            color="text-ustp-navy"
                            bg="bg-ustp-navy/5"
                            onClick={() => openTechDialog('list')}
                        />
                        <StatCard
                            label="Assigned"
                            value={stats.assigned}
                            icon={ClipboardList}
                            color="text-sky-600"
                            bg="bg-sky-50"
                        />
                        <StatCard
                            label="Active"
                            value={stats.active}
                            icon={Wrench}
                            color="text-amber-600"
                            bg="bg-amber-50"
                        />
                        <StatCard
                            label="Unassigned"
                            value={stats.unassigned}
                            icon={UserRound}
                            color="text-red-600"
                            bg="bg-red-50"
                        />
                    </div>

                    <div className="relative max-w-md">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search technicians or job orders..."
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

                    {!hasResults ? (
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                            <UserCog className="size-10 text-slate-300" />
                            <p className="mt-3 text-sm font-medium text-slate-600">
                                No matching assignments
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                                Try a different technician or job order number.
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6">
                            {filteredUnassigned.length > 0 && (
                                <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
                                    <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50/70 px-5 py-3">
                                        <div className="flex items-center gap-2">
                                            <UserRound className="size-4 text-amber-600" />
                                            <h2 className="text-sm font-semibold text-slate-800">
                                                Unassigned Job Orders
                                            </h2>
                                        </div>
                                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                                            {filteredUnassigned.length}
                                        </span>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {filteredUnassigned.map((jobOrder) => (
                                            <JobOrderRow
                                                key={jobOrder.id}
                                                jobOrder={jobOrder}
                                                onAssign={openAssignDialog}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                {filteredGroups.map((group) => {
                                    const activeCount = group.job_orders.filter(
                                        (jobOrder) =>
                                            ['open', 'in_progress'].includes(
                                                jobOrder.status,
                                            ),
                                    ).length;

                                    return (
                                        <div
                                            key={group.technician.id}
                                            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                                        >
                                            <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex size-9 items-center justify-center rounded-full bg-ustp-navy/10 text-xs font-semibold text-ustp-navy">
                                                        {group.technician.name
                                                            .split(' ')
                                                            .map(
                                                                (part) =>
                                                                    part[0],
                                                            )
                                                            .slice(0, 2)
                                                            .join('')
                                                            .toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <h2 className="text-sm font-semibold text-slate-800">
                                                            {
                                                                group.technician
                                                                    .name
                                                            }
                                                        </h2>
                                                        <p className="text-xs text-slate-500">
                                                            {group.technician
                                                                .department ||
                                                                'ICT Office'}
                                                        </p>
                                                        {group.technician
                                                            .expertise && (
                                                            <p className="text-[11px] text-slate-400">
                                                                Expertise:{' '}
                                                                {
                                                                    group
                                                                        .technician
                                                                        .expertise
                                                                }
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-medium text-slate-500">
                                                        {
                                                            group.job_orders
                                                                .length
                                                        }{' '}
                                                        total
                                                    </p>
                                                    <p className="text-[11px] text-amber-600">
                                                        {activeCount} active
                                                    </p>
                                                </div>
                                            </div>

                                            {group.job_orders.length === 0 ? (
                                                <p className="px-5 py-6 text-xs text-slate-400">
                                                    No job orders assigned.
                                                </p>
                                            ) : (
                                                <div className="divide-y divide-slate-100">
                                                    {group.job_orders.map(
                                                        (jobOrder) => (
                                                            <JobOrderRow
                                                                key={
                                                                    jobOrder.id
                                                                }
                                                                jobOrder={
                                                                    jobOrder
                                                                }
                                                                onAssign={
                                                                    openAssignDialog
                                                                }
                                                            />
                                                        ),
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Dialog
                open={techDialogOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        setTechDialogOpen(false);
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    {techView === 'list' ? (
                        <>
                            <DialogHeader>
                                <DialogTitle>Technicians</DialogTitle>
                                <DialogDescription>
                                    {technicians.length === 1
                                        ? '1 technician available for job order assignment.'
                                        : `${technicians.length} technicians available for job order assignment.`}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="max-h-72 space-y-2 overflow-y-auto">
                                {technicians.length === 0 ? (
                                    <p className="py-4 text-center text-sm text-slate-400">
                                        No technicians yet. Add the first
                                        technician.
                                    </p>
                                ) : (
                                    technicians.map((technician) => (
                                        <div
                                            key={technician.id}
                                            className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2"
                                        >
                                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ustp-navy/10 text-xs font-semibold text-ustp-navy">
                                                {technician.name
                                                    .split(' ')
                                                    .map((part) => part[0])
                                                    .slice(0, 2)
                                                    .join('')
                                                    .toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-slate-800">
                                                    {technician.name}
                                                </p>
                                                <p className="truncate text-xs text-slate-500">
                                                    {[
                                                        technician.department ||
                                                            'ICT Office',
                                                        technician.expertise,
                                                        technician.contact_no,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' · ')}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <DialogFooter>
                                <button
                                    type="button"
                                    onClick={() => setTechDialogOpen(false)}
                                    className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                >
                                    Close
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTechView('add')}
                                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-ustp-navy px-4 text-sm font-medium text-white transition hover:bg-ustp-navy-light"
                                >
                                    <UserPlus className="size-4" />
                                    Add technician
                                </button>
                            </DialogFooter>
                        </>
                    ) : (
                        <form
                            className="space-y-4"
                            onSubmit={(event) => {
                                event.preventDefault();
                                submitTechnician();
                            }}
                        >
                            <DialogHeader>
                                <DialogTitle>Add technician</DialogTitle>
                                <DialogDescription>
                                    Create a technician record for job order
                                    assignments. Technicians do not have login
                                    accounts.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-1.5">
                                <label
                                    htmlFor="technician-name"
                                    className="text-xs font-medium text-slate-600"
                                >
                                    Full name
                                </label>
                                <Input
                                    id="technician-name"
                                    value={techForm.name}
                                    onChange={(event) =>
                                        setTechForm({
                                            ...techForm,
                                            name: event.target.value,
                                        })
                                    }
                                    placeholder="e.g. Juan Dela Cruz"
                                    className="h-10 border-slate-300 bg-white text-sm"
                                />
                                {techErrors.name && (
                                    <p className="text-xs text-red-600">
                                        {techErrors.name}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label
                                    htmlFor="technician-phone"
                                    className="text-xs font-medium text-slate-600"
                                >
                                    Phone number (Philippines)
                                </label>
                                <Input
                                    id="technician-phone"
                                    type="tel"
                                    inputMode="tel"
                                    value={techForm.contact_no}
                                    onChange={(event) =>
                                        setTechForm({
                                            ...techForm,
                                            contact_no: event.target.value,
                                        })
                                    }
                                    placeholder="e.g. 0917 123 4567"
                                    className="h-10 border-slate-300 bg-white text-sm"
                                />
                                {techErrors.contact_no && (
                                    <p className="text-xs text-red-600">
                                        {techErrors.contact_no}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label
                                    htmlFor="technician-expertise"
                                    className="text-xs font-medium text-slate-600"
                                >
                                    Expertise (optional)
                                </label>
                                <Input
                                    id="technician-expertise"
                                    value={techForm.expertise}
                                    onChange={(event) =>
                                        setTechForm({
                                            ...techForm,
                                            expertise: event.target.value,
                                        })
                                    }
                                    placeholder="e.g. Networking, hardware repair"
                                    className="h-10 border-slate-300 bg-white text-sm"
                                />
                                {techErrors.expertise && (
                                    <p className="text-xs text-red-600">
                                        {techErrors.expertise}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label
                                    htmlFor="technician-email"
                                    className="text-xs font-medium text-slate-600"
                                >
                                    Email (optional)
                                </label>
                                <Input
                                    id="technician-email"
                                    type="email"
                                    value={techForm.email}
                                    onChange={(event) =>
                                        setTechForm({
                                            ...techForm,
                                            email: event.target.value,
                                        })
                                    }
                                    placeholder="Used for assignment notifications"
                                    className="h-10 border-slate-300 bg-white text-sm"
                                />
                                {techErrors.email && (
                                    <p className="text-xs text-red-600">
                                        {techErrors.email}
                                    </p>
                                )}
                            </div>

                            <DialogFooter>
                                <button
                                    type="button"
                                    onClick={() => setTechView('list')}
                                    className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    disabled={techSubmitting}
                                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-ustp-navy px-4 text-sm font-medium text-white transition hover:bg-ustp-navy-light disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <UserPlus className="size-4" />
                                    {techSubmitting
                                        ? 'Adding...'
                                        : 'Add technician'}
                                </button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog
                open={assignTarget !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        closeAssignDialog();
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {assignTarget?.technician
                                ? 'Change technician'
                                : 'Add technician'}
                        </DialogTitle>
                        <DialogDescription>
                            {assignTarget
                                ? `Job order ${assignTarget.job_order_number} for ${assignTarget.service_request.user.name}.`
                                : ''}
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        className="space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            submitAssignment();
                        }}
                    >
                        <div className="space-y-1.5">
                            <label
                                htmlFor="assign-technician"
                                className="text-xs font-medium text-slate-600"
                            >
                                Technician
                            </label>
                            <Select
                                value={selectedTechnician}
                                onValueChange={setSelectedTechnician}
                            >
                                <SelectTrigger
                                    id="assign-technician"
                                    className="h-10 w-full border-slate-300 bg-white text-sm"
                                >
                                    <SelectValue placeholder="Select a technician" />
                                </SelectTrigger>
                                <SelectContent className="max-h-64 border-slate-200 bg-white text-slate-800">
                                    <SelectItem value={NONE_VALUE}>
                                        None (remove technician)
                                    </SelectItem>
                                    {technicians.map((technician) => (
                                        <SelectItem
                                            key={technician.id}
                                            value={String(technician.id)}
                                        >
                                            {technician.name}
                                            {technician.expertise
                                                ? ` — ${technician.expertise}`
                                                : technician.department
                                                  ? ` — ${technician.department}`
                                                  : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {technicians.length === 0 && (
                                <p className="text-xs text-slate-400">
                                    No technicians available. Promote a user to
                                    ICT Admin first.
                                </p>
                            )}

                            {assignError && (
                                <p className="text-xs text-red-600">
                                    {assignError}
                                </p>
                            )}
                        </div>

                        <DialogFooter>
                            <button
                                type="button"
                                onClick={closeAssignDialog}
                                className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={
                                    submitting ||
                                    technicians.length === 0 ||
                                    (selectedTechnician === NONE_VALUE &&
                                        !assignTarget?.technician)
                                }
                                className="inline-flex h-10 items-center rounded-lg bg-ustp-navy px-4 text-sm font-medium text-white transition hover:bg-ustp-navy-light disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {submitting
                                    ? 'Saving...'
                                    : selectedTechnician === NONE_VALUE
                                      ? 'Remove technician'
                                      : 'Assign technician'}
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
