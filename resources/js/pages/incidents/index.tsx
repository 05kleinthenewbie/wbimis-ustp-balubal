import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    Archive,
    ArrowUpRight,
    CheckCircle2,
    FileText,
    Plus,
    Search,
    ShieldAlert,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type IncidentItem = {
    id: number;
    incident_type: string;
    incident_date: string | null;
    status: string;
    reporter: { name: string };
    inventory_item: { item_name: string } | null;
    user_liabilities: { id: number }[];
};

type Props = {
    incidents: IncidentItem[];
    isAdmin: boolean;
};

const statusBadge: Record<string, string> = {
    open: 'border-slate-200 bg-slate-50 text-slate-600',
    under_review: 'border-amber-200 bg-amber-50 text-amber-700',
    resolved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    closed: 'border-slate-300 bg-slate-100 text-slate-700',
};

const statusDot: Record<string, string> = {
    open: 'bg-slate-400',
    under_review: 'bg-amber-400',
    resolved: 'bg-emerald-400',
    closed: 'bg-slate-500',
};

function formatDate(value: string | null): string {
    if (!value) {
        return '—';
    }

    return new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

export default function IncidentsIndex({ incidents }: Props) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const stats = {
        total: incidents.length,
        open: incidents.filter((i) => i.status === 'open').length,
        under_review: incidents.filter((i) => i.status === 'under_review')
            .length,
        resolved: incidents.filter((i) => i.status === 'resolved').length,
        closed: incidents.filter((i) => i.status === 'closed').length,
    };

    const filtered = incidents.filter((incident) => {
        const q = search.toLowerCase();

        const matchesSearch =
            incident.incident_type.toLowerCase().includes(q) ||
            incident.reporter.name.toLowerCase().includes(q) ||
            incident.inventory_item?.item_name?.toLowerCase().includes(q) ||
            String(incident.id).includes(q);

        const matchesStatus =
            statusFilter === 'all' || incident.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const statusTabs = [
        { key: 'all', label: 'All', count: stats.total },
        {
            key: 'open',
            label: 'Open',
            count: stats.open,
            color: 'text-slate-600',
        },
        {
            key: 'under_review',
            label: 'Under Review',
            count: stats.under_review,
            color: 'text-amber-600',
        },
        {
            key: 'resolved',
            label: 'Resolved',
            count: stats.resolved,
            color: 'text-emerald-600',
        },
        {
            key: 'closed',
            label: 'Closed',
            count: stats.closed,
            color: 'text-slate-600',
        },
    ];

    const hasActiveFilter = statusFilter !== 'all' || search !== '';

    return (
        <>
            <Head title="Laboratory Incident Reports" />

            <div className="relative min-h-full flex-1 overflow-hidden bg-slate-50 px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
                <div className="relative mx-auto max-w-7xl space-y-6">
                    <div className="flex justify-end">
                        <Button
                            asChild
                            className="h-10 bg-ustp-gold px-4 text-sm font-semibold text-ustp-navy shadow-lg shadow-ustp-gold/10 transition-all hover:bg-ustp-gold-dark hover:text-white"
                        >
                            <Link href="/incidents/create">
                                <Plus className="size-4" />
                                Report Laboratory Incident
                            </Link>
                        </Button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                        {[
                            {
                                label: 'Total Laboratory Incidents',
                                value: stats.total,
                                icon: FileText,
                                color: 'text-ustp-navy',
                                bg: 'bg-ustp-navy/5',
                            },
                            {
                                label: 'Open',
                                value: stats.open,
                                icon: AlertTriangle,
                                color: 'text-slate-600',
                                bg: 'bg-slate-100',
                            },
                            {
                                label: 'Under Review',
                                value: stats.under_review,
                                icon: ShieldAlert,
                                color: 'text-amber-600',
                                bg: 'bg-amber-50',
                            },
                            {
                                label: 'Resolved',
                                value: stats.resolved,
                                icon: CheckCircle2,
                                color: 'text-emerald-600',
                                bg: 'bg-emerald-50',
                            },
                            {
                                label: 'Closed',
                                value: stats.closed,
                                icon: Archive,
                                color: 'text-slate-600',
                                bg: 'bg-slate-100',
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

                    {/* Status tabs */}
                    <div className="flex flex-wrap items-center gap-2">
                        {statusTabs.map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setStatusFilter(tab.key)}
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                                    statusFilter === tab.key
                                        ? 'bg-ustp-navy text-white shadow-sm'
                                        : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                }`}
                            >
                                {tab.label}
                                <span
                                    className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                                        statusFilter === tab.key
                                            ? 'bg-white/20 text-white'
                                            : 'bg-slate-100 text-slate-500'
                                    }`}
                                >
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="relative w-full sm:max-w-sm">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />

                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by ID, type, reporter, or equipment..."
                                className="h-10 border-slate-300 bg-white pr-9 pl-9 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:border-ustp-gold/40 focus-visible:ring-1 focus-visible:ring-ustp-gold/20"
                            />

                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    aria-label="Clear search"
                                    className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            {hasActiveFilter && (
                                <button
                                    type="button"
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
                                {filtered.length} incident
                                {filtered.length !== 1 ? 's' : ''}
                            </div>
                        </div>
                    </div>

                    {/* Empty */}
                    {filtered.length === 0 ? (
                        <div className="flex min-h-90 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 text-center">
                            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-ustp-gold/10 text-ustp-gold">
                                <AlertTriangle className="size-6" />
                            </div>

                            <h2 className="text-sm font-medium text-slate-800">
                                {hasActiveFilter
                                    ? 'No matching laboratory incidents'
                                    : 'No laboratory incidents reported yet'}
                            </h2>

                            <p className="mt-1.5 max-w-sm text-xs leading-5 text-slate-400">
                                {hasActiveFilter
                                    ? 'Try a different incident type, reporter, equipment, status, or ID.'
                                    : 'Reported laboratory incidents will appear here once they are created.'}
                            </p>

                            {hasActiveFilter ? (
                                <Button
                                    variant="outline"
                                    className="mt-5 border-slate-200 bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                                    onClick={() => {
                                        setStatusFilter('all');
                                        setSearch('');
                                    }}
                                >
                                    <X className="size-4" />
                                    Clear filters
                                </Button>
                            ) : (
                                <Button
                                    asChild
                                    variant="outline"
                                    className="mt-5 border-ustp-gold/30 bg-transparent text-ustp-gold hover:bg-ustp-gold/10 hover:text-ustp-gold"
                                >
                                    <Link href="/incidents/create">
                                        <Plus className="size-4" />
                                        Report your first laboratory incident
                                    </Link>
                                </Button>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Desktop table */}
                            <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-200 text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200 bg-slate-50">
                                                <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                    Incident
                                                </th>

                                                <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                    Reported by
                                                </th>

                                                <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                    Equipment
                                                </th>

                                                <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                    Date
                                                </th>

                                                <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                    Status
                                                </th>

                                                <th className="w-16 px-5 py-3.5" />
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {filtered.map((incident) => (
                                                <tr
                                                    key={incident.id}
                                                    className="group border-b border-slate-200 transition-colors last:border-0 hover:bg-slate-50"
                                                >
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-start gap-3">
                                                            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-ustp-gold/10 text-ustp-gold">
                                                                <AlertTriangle className="size-4" />
                                                            </div>

                                                            <div className="min-w-0">
                                                                <span className="font-mono text-[10px] text-slate-400">
                                                                    #
                                                                    {
                                                                        incident.id
                                                                    }
                                                                </span>

                                                                <p className="mt-0.5 truncate font-medium text-slate-800">
                                                                    {
                                                                        incident.incident_type
                                                                    }
                                                                </p>

                                                                {incident
                                                                    .user_liabilities
                                                                    .length >
                                                                    0 && (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="mt-1.5 border-red-200 bg-red-50 text-[10px] text-red-600"
                                                                    >
                                                                        Liability
                                                                        assigned
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        <span className="text-sm text-slate-600">
                                                            {
                                                                incident
                                                                    .reporter
                                                                    .name
                                                            }
                                                        </span>
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        <span className="text-xs text-slate-400">
                                                            {incident
                                                                .inventory_item
                                                                ?.item_name ??
                                                                '—'}
                                                        </span>
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        <span className="text-xs text-slate-500">
                                                            {formatDate(
                                                                incident.incident_date,
                                                            )}
                                                        </span>
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        <span
                                                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize ${statusBadge[incident.status] ?? 'border-slate-200 bg-slate-50 text-slate-500'}`}
                                                        >
                                                            <span
                                                                className={`size-1.5 rounded-full ${statusDot[incident.status] ?? 'bg-slate-300'}`}
                                                            />
                                                            {incident.status.replace(
                                                                '_',
                                                                ' ',
                                                            )}
                                                        </span>
                                                    </td>

                                                    <td className="px-5 py-4 text-right">
                                                        <Link
                                                            href={`/incidents/${incident.id}`}
                                                            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-ustp-gold"
                                                        >
                                                            View
                                                            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Mobile cards */}
                            <div className="space-y-3 md:hidden">
                                {filtered.map((incident) => (
                                    <Link
                                        key={incident.id}
                                        href={`/incidents/${incident.id}`}
                                        className="block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                                    >
                                        <div className="p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex min-w-0 gap-3">
                                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ustp-gold/10 text-ustp-gold">
                                                        <AlertTriangle className="size-4" />
                                                    </div>

                                                    <div className="min-w-0">
                                                        <p className="truncate font-medium text-slate-800">
                                                            {
                                                                incident.incident_type
                                                            }
                                                        </p>
                                                        <p className="mt-0.5 text-xs text-slate-400">
                                                            #{incident.id} ·{' '}
                                                            {
                                                                incident
                                                                    .reporter
                                                                    .name
                                                            }
                                                        </p>
                                                    </div>
                                                </div>

                                                <span
                                                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${statusBadge[incident.status] ?? 'border-slate-200 bg-slate-50 text-slate-500'}`}
                                                >
                                                    <span
                                                        className={`size-1.5 rounded-full ${statusDot[incident.status] ?? 'bg-slate-300'}`}
                                                    />
                                                    {incident.status.replace(
                                                        '_',
                                                        ' ',
                                                    )}
                                                </span>
                                            </div>

                                            <div className="mt-3 flex items-center justify-between">
                                                <span className="truncate text-[11px] text-slate-400">
                                                    {incident.inventory_item
                                                        ?.item_name ??
                                                        'No equipment linked'}
                                                </span>
                                                <span className="ml-2 shrink-0 text-[10px] text-slate-400">
                                                    {formatDate(
                                                        incident.incident_date,
                                                    )}
                                                </span>
                                            </div>

                                            <div className="mt-2 flex items-center justify-between">
                                                {incident.user_liabilities
                                                    .length > 0 ? (
                                                    <Badge
                                                        variant="outline"
                                                        className="border-red-200 bg-red-50 text-[10px] text-red-600"
                                                    >
                                                        Liability assigned
                                                    </Badge>
                                                ) : (
                                                    <span />
                                                )}

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
