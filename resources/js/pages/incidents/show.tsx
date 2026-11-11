import { Head, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    Archive,
    Calendar,
    CheckCircle2,
    FileQuestion,
    RotateCcw,
    Save,
    ShieldAlert,
    User,
    UserPlus,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { BackButton } from '@/components/back-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';

type Liability = {
    id: number;
    liability_description: string | null;
    liability_amount: string | null;
    liability_status: string;
    acknowledged_at: string | null;
    user: { name: string };
};

type IncidentDetail = {
    id: number;
    incident_type: string;
    incident_description: string;
    incident_date: string | null;
    status: string;
    resolution_notes: string | null;
    reporter: { name: string };
    inventory_item: { item_name: string; property_no: string } | null;
    user_liabilities: Liability[];
    attachments: {
        id: number;
        file_name: string;
        uploaded_at: string | null;
    }[];
};

type UserOption = {
    id: number;
    name: string;
};

type Props = {
    incident: IncidentDetail;
    isAdmin: boolean;
    users?: UserOption[];
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
    open: {
        label: 'Open',
        color: 'text-slate-600',
        bg: 'bg-slate-50',
        border: 'border-slate-200',
        icon: <AlertTriangle className="size-5" />,
    },
    under_review: {
        label: 'Under Review',
        color: 'text-amber-700',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        icon: <ShieldAlert className="size-5" />,
    },
    resolved: {
        label: 'Resolved',
        color: 'text-emerald-700',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        icon: <CheckCircle2 className="size-5" />,
    },
    closed: {
        label: 'Closed',
        color: 'text-slate-700',
        bg: 'bg-slate-100',
        border: 'border-slate-300',
        icon: <Archive className="size-5" />,
    },
};

const statusSteps = [
    { key: 'open', label: 'Open' },
    { key: 'under_review', label: 'Under Review' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'closed', label: 'Closed' },
];

const liabilityStatusConfig: Record<string, string> = {
    pending: 'border-amber-200 bg-amber-50 text-amber-700',
    settled: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    waived: 'border-slate-200 bg-slate-50 text-slate-500',
};

const NONE_VALUE = '__none__';

function formatDate(value: string | null): string {
    if (!value) {
        return 'Not specified';
    }

    return new Date(value).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
}

function formatAmount(value: string | null): string | null {
    if (value === null || value === '') {
        return null;
    }

    return `₱${Number(value).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function StatusStepper({ current }: { current: string }) {
    const activeIndex = Math.max(
        0,
        statusSteps.findIndex((s) => s.key === current),
    );

    return (
        <ol className="space-y-0">
            {statusSteps.map((step, index) => {
                const done = index < activeIndex;
                const active = index === activeIndex;

                return (
                    <li key={step.key} className="relative flex gap-3">
                        {index < statusSteps.length - 1 && (
                            <span
                                aria-hidden
                                className={`absolute top-6 left-2.25 h-[calc(100%-4px)] w-0.5 ${
                                    done ? 'bg-ustp-gold/60' : 'bg-slate-200'
                                }`}
                            />
                        )}

                        <span
                            className={`relative z-10 mt-0.5 flex size-4.75 shrink-0 items-center justify-center rounded-full border-2 text-[9px] font-bold ${
                                active
                                    ? 'border-ustp-gold bg-ustp-gold text-ustp-navy'
                                    : done
                                      ? 'border-ustp-gold/50 bg-ustp-gold/15 text-ustp-gold'
                                      : 'border-slate-200 bg-white text-slate-300'
                            }`}
                        >
                            {done ? (
                                <CheckCircle2 className="size-3" />
                            ) : (
                                index + 1
                            )}
                        </span>

                        <div className="pb-5">
                            <p
                                className={`text-xs leading-5 font-medium ${
                                    active
                                        ? 'text-slate-800'
                                        : done
                                          ? 'text-slate-500'
                                          : 'text-slate-400'
                                }`}
                            >
                                {step.label}
                            </p>
                            {active && (
                                <p className="text-[11px] text-slate-400">
                                    Current status
                                </p>
                            )}
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}

export default function IncidentsShow({
    incident,
    isAdmin,
    users = [],
}: Props) {
    const [status, setStatus] = useState(incident.status);
    const [resolutionNotes, setResolutionNotes] = useState(
        incident.resolution_notes ?? '',
    );
    const [liabilityUserId, setLiabilityUserId] = useState('');
    const [liabilityDescription, setLiabilityDescription] = useState('');
    const [liabilityAmount, setLiabilityAmount] = useState('');
    const [processing, setProcessing] = useState(false);
    const [resolvingId, setResolvingId] = useState<number | null>(null);
    const { errors } = usePage<{ errors: Record<string, string> }>().props;

    const displayStatus = status;
    const statusCfg = statusConfig[displayStatus] ?? statusConfig.open;
    const statusChanged = status !== incident.status;
    const dirty =
        statusChanged ||
        resolutionNotes !== (incident.resolution_notes ?? '') ||
        (liabilityUserId !== '' && liabilityUserId !== NONE_VALUE) ||
        liabilityDescription.trim() !== '' ||
        liabilityAmount.trim() !== '';

    function handleSave() {
        if (!dirty) {
            return;
        }

        const hasAssignee =
            liabilityUserId !== '' && liabilityUserId !== NONE_VALUE;

        if (!hasAssignee && liabilityAmount.trim() !== '') {
            toast.error('Select a user before entering a liability amount.');

            return;
        }

        setProcessing(true);
        router.put(
            `/incidents/${incident.id}`,
            {
                status,
                resolution_notes: resolutionNotes || null,
                liability_user_id: hasAssignee ? liabilityUserId : null,
                liability_description: liabilityDescription || null,
                liability_amount:
                    liabilityAmount.trim() === ''
                        ? null
                        : liabilityAmount.trim(),
            },
            {
                onFinish: () => setProcessing(false),
                onSuccess: () => {
                    toast.success('Laboratory incident updated successfully.');
                    setLiabilityUserId('');
                    setLiabilityDescription('');
                    setLiabilityAmount('');
                },
                onError: (validationErrors) => {
                    const firstError = Object.values(validationErrors)[0];

                    toast.error(
                        firstError ??
                            'Could not save changes. Please try again.',
                    );
                },
            },
        );
    }

    function handleReset() {
        setStatus(incident.status);
        setResolutionNotes(incident.resolution_notes ?? '');
        setLiabilityUserId('');
        setLiabilityDescription('');
        setLiabilityAmount('');
    }

    function handleResolveLiability(
        liabilityId: number,
        liabilityStatus: 'settled' | 'waived',
    ) {
        setResolvingId(liabilityId);
        router.post(
            `/incidents/${incident.id}/liabilities/${liabilityId}/resolve`,
            { liability_status: liabilityStatus },
            {
                onFinish: () => setResolvingId(null),
                onSuccess: () => {
                    toast.success(`Liability marked as ${liabilityStatus}.`);
                },
                onError: () => {
                    toast.error(
                        'Could not update the liability. Please try again.',
                    );
                },
            },
        );
    }

    return (
        <>
            <Head title={`Laboratory Incident #${incident.id}`} />

            <div className="relative min-h-full flex-1 overflow-hidden bg-slate-50 px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
                <div className="relative mx-auto max-w-4xl space-y-6">
                    <div className="flex items-center justify-between gap-3">
                        {statusChanged && (
                            <span className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-medium text-amber-700">
                                <span className="size-1.5 animate-pulse rounded-full bg-amber-400" />
                                Unsaved status change
                            </span>
                        )}
                        <BackButton href="/incidents" />
                    </div>

                    {/* Header */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                            <div className="flex gap-4">
                                <div
                                    className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${statusCfg.bg} ${statusCfg.color}`}
                                >
                                    {statusCfg.icon}
                                </div>

                                <div>
                                    <div className="mb-1 flex flex-wrap items-center gap-2">
                                        <span className="font-mono text-[10px] text-slate-400">
                                            LABORATORY INCIDENT #{incident.id}
                                        </span>

                                        <span className="size-1 rounded-full bg-slate-300" />

                                        <span className="text-[10px] tracking-wider text-slate-400 uppercase">
                                            Laboratory Incident
                                        </span>
                                    </div>

                                    <h2 className="text-xl font-semibold tracking-tight text-slate-800 md:text-2xl">
                                        {incident.incident_type}
                                    </h2>

                                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                                        <span>
                                            Reported by {incident.reporter.name}
                                        </span>

                                        <span className="flex items-center gap-1.5">
                                            <Calendar className="size-3.5" />
                                            {formatDate(incident.incident_date)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <Badge
                                variant="outline"
                                className={`w-fit rounded-lg px-3 py-1 text-[10px] font-medium capitalize ${statusCfg.border} ${statusCfg.bg} ${statusCfg.color}`}
                            >
                                {statusCfg.label}
                            </Badge>
                        </div>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
                        {/* Main */}
                        <div className="space-y-5">
                            {/* Reporter card */}
                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 md:px-6">
                                    <div className="flex size-9 items-center justify-center rounded-lg bg-ustp-gold/10">
                                        <User className="size-4 text-ustp-gold" />
                                    </div>

                                    <div>
                                        <h2 className="text-sm font-semibold text-slate-800">
                                            Reporter information
                                        </h2>
                                        <p className="mt-0.5 text-[11px] text-slate-400">
                                            Who reported this incident
                                        </p>
                                    </div>
                                </div>

                                <div className="grid divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                                    <div className="p-6">
                                        <p className="text-[10px] font-medium tracking-[0.12em] text-slate-400 uppercase">
                                            Reported by
                                        </p>
                                        <p className="mt-2 text-sm font-medium text-slate-800">
                                            {incident.reporter.name}
                                        </p>
                                    </div>

                                    <div className="p-6">
                                        <p className="text-[10px] font-medium tracking-[0.12em] text-slate-400 uppercase">
                                            Incident date
                                        </p>
                                        <p className="mt-2 text-sm font-medium text-slate-800">
                                            {formatDate(incident.incident_date)}
                                        </p>
                                    </div>

                                    <div className="p-6">
                                        <p className="text-[10px] font-medium tracking-[0.12em] text-slate-400 uppercase">
                                            Equipment
                                        </p>
                                        <p className="mt-2 text-sm font-medium text-slate-800">
                                            {incident.inventory_item
                                                ?.item_name ?? '—'}
                                        </p>
                                        {incident.inventory_item
                                            ?.property_no && (
                                            <p className="mt-0.5 text-xs text-slate-400">
                                                {
                                                    incident.inventory_item
                                                        .property_no
                                                }
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                                <div className="mb-4 flex items-center gap-3">
                                    <div className="flex size-9 items-center justify-center rounded-lg bg-ustp-gold/10">
                                        <AlertTriangle className="size-4 text-ustp-gold" />
                                    </div>

                                    <p className="text-sm font-semibold text-slate-800">
                                        Description
                                    </p>
                                </div>

                                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                                    <p className="text-sm leading-6 whitespace-pre-wrap text-slate-600">
                                        {incident.incident_description.trim() ? (
                                            incident.incident_description
                                        ) : (
                                            <span className="text-slate-400 italic">
                                                No description provided.
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* Resolution notes */}
                            {incident.resolution_notes && (
                                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                    <div className="flex items-center gap-3 border-b border-slate-200 bg-ustp-gold/4 px-5 py-4 md:px-6">
                                        <div className="flex size-9 items-center justify-center rounded-lg bg-ustp-gold/10">
                                            <ShieldAlert className="size-4 text-ustp-gold" />
                                        </div>

                                        <p className="text-sm font-semibold text-slate-800">
                                            Resolution notes
                                        </p>
                                    </div>
                                    <div className="p-5 md:p-6">
                                        <p className="text-sm leading-6 whitespace-pre-wrap text-slate-600">
                                            {incident.resolution_notes}
                                        </p>
                                    </div>
                                </section>
                            )}

                            {/* Evidence attachments */}
                            {incident.attachments.length > 0 && (
                                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                    <div className="flex items-center gap-3 border-b border-slate-200 bg-ustp-gold/4 px-5 py-4 md:px-6">
                                        <div className="flex size-9 items-center justify-center rounded-lg bg-ustp-gold/10">
                                            <FileQuestion className="size-4 text-ustp-gold" />
                                        </div>

                                        <p className="text-sm font-semibold text-slate-800">
                                            Evidence
                                        </p>
                                    </div>
                                    <ul className="divide-y divide-slate-200">
                                        {incident.attachments.map(
                                            (attachment) => (
                                                <li
                                                    key={attachment.id}
                                                    className="flex items-center justify-between gap-3 px-5 py-3 md:px-6"
                                                >
                                                    <span className="truncate text-sm text-slate-600">
                                                        {attachment.file_name}
                                                    </span>
                                                    <a
                                                        href={`/incidents/${incident.id}/attachments/${attachment.id}`}
                                                        className="shrink-0 text-xs font-semibold text-ustp-navy underline-offset-2 hover:underline"
                                                    >
                                                        Download
                                                    </a>
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                </section>
                            )}

                            {/* Liability records */}
                            {incident.user_liabilities.length > 0 && (
                                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                    <div className="flex items-center gap-3 border-b border-slate-200 bg-ustp-gold/4 px-5 py-4 md:px-6">
                                        <div className="flex size-9 items-center justify-center rounded-lg bg-ustp-gold/10">
                                            <UserPlus className="size-4 text-ustp-gold" />
                                        </div>

                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">
                                                Liability records
                                            </p>
                                            <p className="mt-0.5 text-[11px] text-slate-400">
                                                {
                                                    incident.user_liabilities
                                                        .length
                                                }{' '}
                                                record
                                                {incident.user_liabilities
                                                    .length !== 1
                                                    ? 's'
                                                    : ''}{' '}
                                                assigned
                                            </p>
                                        </div>
                                    </div>

                                    <div className="divide-y divide-slate-200">
                                        {incident.user_liabilities.map(
                                            (liability) => (
                                                <div
                                                    key={liability.id}
                                                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6"
                                                >
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-800">
                                                            {
                                                                liability.user
                                                                    .name
                                                            }
                                                        </p>
                                                        {liability.liability_description && (
                                                            <p className="mt-1 text-xs text-slate-400">
                                                                {
                                                                    liability.liability_description
                                                                }
                                                            </p>
                                                        )}

                                                        {formatAmount(
                                                            liability.liability_amount,
                                                        ) && (
                                                            <p className="mt-1 text-xs font-medium text-slate-600">
                                                                {formatAmount(
                                                                    liability.liability_amount,
                                                                )}
                                                            </p>
                                                        )}
                                                        <p className="mt-1 text-xs text-slate-500">
                                                            {liability.acknowledged_at
                                                                ? `Acknowledged ${new Date(liability.acknowledged_at).toLocaleString()}`
                                                                : 'Not yet acknowledged'}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={`w-fit rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize ${liabilityStatusConfig[liability.liability_status] ?? 'border-slate-200 bg-slate-50 text-slate-500'}`}
                                                        >
                                                            {
                                                                liability.liability_status
                                                            }
                                                        </span>

                                                        {isAdmin &&
                                                            liability.liability_status ===
                                                                'pending' && (
                                                                <div className="flex gap-1.5">
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        disabled={
                                                                            resolvingId ===
                                                                            liability.id
                                                                        }
                                                                        className="h-7 border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100"
                                                                        onClick={() =>
                                                                            handleResolveLiability(
                                                                                liability.id,
                                                                                'settled',
                                                                            )
                                                                        }
                                                                    >
                                                                        <CheckCircle2 className="size-3" />
                                                                        Settle
                                                                    </Button>

                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        disabled={
                                                                            resolvingId ===
                                                                            liability.id
                                                                        }
                                                                        className="h-7 border border-slate-200 bg-slate-50 px-2.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
                                                                        onClick={() =>
                                                                            handleResolveLiability(
                                                                                liability.id,
                                                                                'waived',
                                                                            )
                                                                        }
                                                                    >
                                                                        <RotateCcw className="size-3" />
                                                                        Waive
                                                                    </Button>
                                                                </div>
                                                            )}
                                                    </div>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </section>
                            )}
                        </div>

                        {/* Admin review sidebar */}
                        {isAdmin && (
                            <div className="h-fit overflow-hidden rounded-2xl border border-ustp-gold/30 bg-white shadow-sm">
                                <div className="flex items-center gap-3 border-b border-slate-200 bg-ustp-gold/4 px-5 py-5">
                                    <div className="flex size-9 items-center justify-center rounded-lg bg-ustp-gold/10">
                                        <ShieldAlert className="size-4 text-ustp-gold" />
                                    </div>

                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">
                                            Review incident
                                        </p>
                                        <p className="mt-0.5 text-[11px] text-slate-400">
                                            Update status and assign liability
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-5 p-5">
                                    <div className="grid gap-2">
                                        <Label className="text-xs font-medium text-slate-600">
                                            Progress
                                        </Label>
                                        <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                                            <StatusStepper current={status} />
                                        </div>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label className="text-xs font-medium text-slate-600">
                                            Status
                                        </Label>
                                        <Select
                                            value={status}
                                            onValueChange={setStatus}
                                        >
                                            <SelectTrigger className="h-10 w-full border-slate-300 bg-white text-sm text-slate-800 focus-visible:border-ustp-gold/40 focus-visible:ring-1 focus-visible:ring-ustp-gold/20">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="border-slate-200 bg-white text-slate-800">
                                                <SelectItem value="open">
                                                    Open
                                                </SelectItem>
                                                <SelectItem value="under_review">
                                                    Under Review
                                                </SelectItem>
                                                <SelectItem value="resolved">
                                                    Resolved
                                                </SelectItem>
                                                <SelectItem value="closed">
                                                    Closed
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.status && (
                                            <p className="text-[11px] text-red-600">
                                                {errors.status}
                                            </p>
                                        )}
                                    </div>

                                    <div className="grid gap-2">
                                        <Label className="text-xs font-medium text-slate-600">
                                            Resolution notes{' '}
                                            <span className="font-normal text-slate-400">
                                                (required to resolve/close)
                                            </span>
                                        </Label>
                                        <Textarea
                                            value={resolutionNotes}
                                            onChange={(event) =>
                                                setResolutionNotes(
                                                    event.target.value,
                                                )
                                            }
                                            rows={3}
                                            placeholder="Findings, actions taken, or recommendation..."
                                            className="text-sm"
                                        />
                                        {errors.resolution_notes && (
                                            <p className="text-[11px] text-red-600">
                                                {errors.resolution_notes}
                                            </p>
                                        )}
                                    </div>

                                    <div className="grid gap-2">
                                        <Label className="text-xs font-medium text-slate-600">
                                            Assign liability{' '}
                                            <span className="font-normal text-slate-400">
                                                (optional)
                                            </span>
                                        </Label>
                                        <Select
                                            value={
                                                liabilityUserId || NONE_VALUE
                                            }
                                            onValueChange={(value) =>
                                                setLiabilityUserId(
                                                    value === NONE_VALUE
                                                        ? ''
                                                        : value,
                                                )
                                            }
                                        >
                                            <SelectTrigger className="h-10 w-full border-slate-300 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus-visible:border-ustp-gold/40 focus-visible:ring-1 focus-visible:ring-ustp-gold/20">
                                                <SelectValue placeholder="Select a user" />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-64 border-slate-200 bg-white text-slate-800">
                                                <SelectItem value={NONE_VALUE}>
                                                    None
                                                </SelectItem>
                                                {users.map((user) => (
                                                    <SelectItem
                                                        key={user.id}
                                                        value={String(user.id)}
                                                    >
                                                        {user.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        {users.length === 0 && (
                                            <p className="text-[11px] text-slate-400">
                                                No users available for
                                                assignment.
                                            </p>
                                        )}
                                        {errors.liability_user_id && (
                                            <p className="text-[11px] text-red-600">
                                                {errors.liability_user_id}
                                            </p>
                                        )}
                                    </div>

                                    <div className="grid gap-2">
                                        <Label className="text-xs font-medium text-slate-600">
                                            Liability amount{' '}
                                            <span className="font-normal text-slate-400">
                                                (optional)
                                            </span>
                                        </Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            inputMode="decimal"
                                            placeholder="0.00"
                                            value={liabilityAmount}
                                            onChange={(
                                                e: React.ChangeEvent<HTMLInputElement>,
                                            ) =>
                                                setLiabilityAmount(
                                                    e.target.value,
                                                )
                                            }
                                            className="border-slate-300 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus-visible:border-ustp-gold/40 focus-visible:ring-1 focus-visible:ring-ustp-gold/20"
                                        />
                                        {errors.liability_amount && (
                                            <p className="text-[11px] text-red-600">
                                                {errors.liability_amount}
                                            </p>
                                        )}
                                    </div>

                                    <div className="grid gap-2">
                                        <Label className="text-xs font-medium text-slate-600">
                                            Notes{' '}
                                            <span className="font-normal text-slate-400">
                                                (optional)
                                            </span>
                                        </Label>
                                        <Textarea
                                            rows={3}
                                            placeholder="Reason for liability or review notes..."
                                            value={liabilityDescription}
                                            onChange={(
                                                e: React.ChangeEvent<HTMLTextAreaElement>,
                                            ) =>
                                                setLiabilityDescription(
                                                    e.target.value,
                                                )
                                            }
                                            className="border-slate-300 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus-visible:border-ustp-gold/40 focus-visible:ring-1 focus-visible:ring-ustp-gold/20"
                                        />
                                        {errors.liability_description && (
                                            <p className="text-[11px] text-red-600">
                                                {errors.liability_description}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
                                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={processing || !dirty}
                                            onClick={handleReset}
                                            className="border-slate-200 bg-transparent text-slate-500 hover:border-ustp-gold/30 hover:bg-ustp-gold/10 hover:text-ustp-gold"
                                        >
                                            <RotateCcw className="size-4" />
                                            Reset
                                        </Button>

                                        <Button
                                            type="button"
                                            disabled={processing || !dirty}
                                            onClick={handleSave}
                                            className="bg-ustp-gold text-ustp-navy shadow-lg shadow-ustp-gold/10 transition-all hover:bg-ustp-gold-dark hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            {processing ? (
                                                <Spinner />
                                            ) : (
                                                <Save className="size-4" />
                                            )}
                                            Save changes
                                        </Button>
                                    </div>

                                    <p className="mt-3 text-[11px] leading-5 text-slate-400">
                                        The reporter will see the updated
                                        incident status after your review.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Status summary when not admin */}
                        {!isAdmin && (
                            <div className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <p className="text-[10px] font-medium tracking-[0.12em] text-slate-400 uppercase">
                                    Incident status
                                </p>

                                <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                                    <StatusStepper current={incident.status} />
                                </div>

                                <div className="mt-4 flex items-center gap-3">
                                    <div
                                        className={`flex size-9 items-center justify-center rounded-lg ${statusCfg.bg} ${statusCfg.color}`}
                                    >
                                        {statusCfg.icon}
                                    </div>

                                    <div>
                                        <p className="text-sm font-medium text-slate-800 capitalize">
                                            {displayStatus.replace('_', ' ')}
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-400">
                                            Reported by {incident.reporter.name}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
