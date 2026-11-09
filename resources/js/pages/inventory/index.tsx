import { Head, Link, router } from '@inertiajs/react';
import {
    Box,
    CheckCircle2,
    AlertTriangle,
    Wrench,
    Plus,
    Search,
    Trash2,
    MapPin,
    Tag,
    Computer,
    Keyboard,
    Wifi,
    Laptop,
    Printer,
    Projector,
    BatteryCharging,
    Droplets,
    Sparkles,
    Battery,
    ShieldCheck,
    KeyRound,
    Lock,
    CalendarClock,
    ArrowUpRight,
    ChevronLeft,
    ChevronRight,
    User as UserIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type InventoryItemRow = {
    id: number;
    property_no: string;
    item_inventory_no: string | null;
    item_name: string;
    category: string | null;
    brand: string | null;
    model: string | null;
    serial_no: string | null;
    location: string | null;
    campus: string | null;
    building: string | null;
    room: string | null;
    end_user: string | null;
    condition: string;
    status: string;
    expiration_date: string | null;
    expiration_type?: string | null;
    document_type: 'ICS' | 'PAR' | null;
};

type Filters = {
    search?: string;
    category?: string;
    condition?: string;
    status?: string;
    campus?: string;
    end_user?: string;
    document_type?: string;
};

type Options = {
    categories: string[];
    campuses: string[];
    endUsers: string[];
};

type Stats = {
    total: number;
    working: number;
    defective: number;
    under_repair: number;
    active: number;
    for_disposal: number;
    retired: number;
    disposed: number;
};

type Props = {
    items: InventoryItemRow[];
    filters: Filters;
    stats: Stats;
    options: Options;
};

const conditionConfig: Record<
    string,
    { icon: React.ElementType; badge: string; dot: string }
> = {
    working: {
        icon: CheckCircle2,
        badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        dot: 'bg-emerald-400',
    },
    defective: {
        icon: AlertTriangle,
        badge: 'border-red-200 bg-red-50 text-red-600',
        dot: 'bg-red-400',
    },
    under_repair: {
        icon: Wrench,
        badge: 'border-amber-200 bg-amber-50 text-amber-700',
        dot: 'bg-amber-400',
    },
};

const statusConfig: Record<string, string> = {
    active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    for_disposal: 'border-orange-200 bg-orange-50 text-orange-700',
    retired: 'border-slate-200 bg-slate-50 text-slate-600',
    disposed: 'border-red-200 bg-red-50 text-red-600',
};

const statusLabels: Record<string, string> = {
    active: 'Active',
    for_disposal: 'For Disposal',
    retired: 'Retired',
    disposed: 'Disposed',
};

const conditionLabels: Record<string, string> = {
    working: 'Working',
    defective: 'Defective',
    under_repair: 'Under Repair',
};

function expiryState(
    dateStr: string | null,
): 'expired' | 'soon' | 'valid' | null {
    if (!dateStr) {
        return null;
    }

    const expiry = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (expiry < today) {
        return 'expired';
    }

    const soon = new Date(today);
    soon.setDate(soon.getDate() + 30);

    return expiry <= soon ? 'soon' : 'valid';
}

function getCategoryFromName(name: string): string {
    const lower = name.toLowerCase();

    if (
        lower.includes('router') ||
        lower.includes('switch') ||
        lower.includes('access point') ||
        lower.includes('modem') ||
        lower.includes('firewall') ||
        lower.includes('network')
    ) {
        return 'Network Devices';
    }

    if (
        lower.includes('toner') ||
        lower.includes('ink') ||
        lower.includes('cartridge') ||
        lower.includes('refill')
    ) {
        return 'Printers';
    }

    if (lower.includes('laptop') || lower.includes('notebook')) {
        return 'Laptops';
    }

    if (lower.includes('projector')) {
        return 'Projectors';
    }

    if (lower.includes('ups')) {
        return 'UPS Devices';
    }

    if (lower.includes('printer')) {
        return 'Printers';
    }

    if (
        lower.includes('desktop') ||
        lower.includes('monitor') ||
        lower.includes('system unit') ||
        lower.includes('pc set') ||
        lower.includes('server')
    ) {
        return 'Desktop Computers';
    }

    return 'Uncategorized';
}

const legacyCategoryAliases: Record<string, string> = {
    Desktop: 'Desktop Computers',
    Laptop: 'Laptops',
    Printer: 'Printers',
    Projector: 'Projectors',
    Server: 'Desktop Computers',
    Other: 'Desktop Computers',
    Network: 'Network Devices',
    Monitor: 'Desktop Computers',
    UPS: 'UPS Devices',
    Battery: 'Batteries',
    'SSL Certificate': 'SSL/TLS Certificates',
    Hardware: 'Desktop Computers',
    'Network Equipment': 'Network Devices',
    'ICT Peripherals': 'Desktop Computers',
};

function resolveCategory(item: InventoryItemRow): string {
    const stored = item.category || getCategoryFromName(item.item_name);

    return legacyCategoryAliases[stored] ?? stored;
}

const categoryIcons: Record<string, React.ElementType> = {
    'Desktop Computers': Computer,
    Laptops: Laptop,
    Printers: Printer,
    Projectors: Projector,
    'Network Devices': Wifi,
    'UPS Devices': BatteryCharging,
    'Printer Ink': Droplets,
    'Toner Cartridges': Printer,
    'Thermal Paste': Wrench,
    'Cleaning Supplies': Sparkles,
    Batteries: Battery,
    'Antivirus Licenses': ShieldCheck,
    'Software Subscriptions': KeyRound,
    'SSL/TLS Certificates': Lock,
    Hardware: Computer,
    'Network Equipment': Wifi,
    'ICT Peripherals': Keyboard,
};

const categoryColors: Record<string, string> = {
    'Desktop Computers': 'bg-ustp-gold/10 text-ustp-gold',
    Laptops: 'bg-ustp-gold/10 text-ustp-gold',
    Printers: 'bg-ustp-gold/10 text-ustp-gold',
    Projectors: 'bg-ustp-gold/10 text-ustp-gold',
    'Network Devices': 'bg-cyan-400/10 text-cyan-400',
    'UPS Devices': 'bg-cyan-400/10 text-cyan-400',
    'Printer Ink': 'bg-emerald-400/10 text-emerald-400',
    'Toner Cartridges': 'bg-emerald-400/10 text-emerald-400',
    'Thermal Paste': 'bg-emerald-400/10 text-emerald-400',
    'Cleaning Supplies': 'bg-emerald-400/10 text-emerald-400',
    Batteries: 'bg-emerald-400/10 text-emerald-400',
    'Antivirus Licenses': 'bg-purple-400/10 text-purple-400',
    'Software Subscriptions': 'bg-purple-400/10 text-purple-400',
    'SSL/TLS Certificates': 'bg-purple-400/10 text-purple-400',
    Hardware: 'bg-ustp-gold/10 text-ustp-gold',
    'Network Equipment': 'bg-cyan-400/10 text-cyan-400',
    'ICT Peripherals': 'bg-emerald-400/10 text-emerald-400',
};

function ConditionRingChart({
    working,
    defective,
    underRepair,
    total,
}: {
    working: number;
    defective: number;
    underRepair: number;
    total: number;
}) {
    const size = 100;
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const segments = [
        { key: 'working', count: working, color: 'rgba(52,211,153,0.9)' },
        { key: 'defective', count: defective, color: 'rgba(248,113,113,0.9)' },
        {
            key: 'under_repair',
            count: underRepair,
            color: 'rgba(251,191,36,0.9)',
        },
    ].filter((s) => s.count > 0);

    let accumulated = 0;
    const arcs = segments.map((seg) => {
        const pct = total > 0 ? seg.count / total : 0;
        const dashLength = circumference * pct - 1;
        const dashOffset = circumference * (1 - accumulated / total);
        accumulated += seg.count;

        return { ...seg, dashLength: Math.max(0, dashLength), dashOffset };
    });

    return (
        <div className="flex items-center gap-5">
            <div className="relative shrink-0">
                <svg width={size} height={size} className="-rotate-90">
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="rgba(226,232,240,0.9)"
                        strokeWidth={strokeWidth}
                    />
                    {arcs.map((arc) => (
                        <circle
                            key={arc.key}
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            fill="none"
                            stroke={arc.color}
                            strokeWidth={strokeWidth}
                            strokeDasharray={`${arc.dashLength} ${circumference - arc.dashLength}`}
                            strokeDashoffset={arc.dashOffset}
                            strokeLinecap="round"
                            className="transition-all duration-700"
                        />
                    ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-slate-800">
                        {total}
                    </span>
                    <span className="text-[8px] tracking-wider text-slate-400 uppercase">
                        total
                    </span>
                </div>
            </div>

            <div className="space-y-2">
                {[
                    {
                        label: 'Working',
                        count: working,
                        color: 'bg-emerald-400',
                    },
                    {
                        label: 'Defective',
                        count: defective,
                        color: 'bg-red-400',
                    },
                    {
                        label: 'Under Repair',
                        count: underRepair,
                        color: 'bg-amber-400',
                    },
                ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                        <span className={`size-2 rounded-full ${item.color}`} />
                        <span className="text-xs text-slate-500">
                            {item.label}
                        </span>
                        <span className="text-xs font-semibold text-slate-600">
                            {item.count}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function CategoryBreakdown({ items }: { items: InventoryItemRow[] }) {
    const counts: Record<string, number> = {};
    items.forEach((item) => {
        const cat = resolveCategory(item);
        counts[cat] = (counts[cat] || 0) + 1;
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const max = sorted.length > 0 ? sorted[0][1] : 1;

    return (
        <div className="space-y-2.5">
            {sorted.map(([cat, count]) => {
                const Icon = categoryIcons[cat] ?? Box;
                const pct = (count / max) * 100;

                return (
                    <div key={cat}>
                        <div className="mb-1 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Icon className="size-3.5 text-slate-400" />
                                <span className="text-xs text-slate-500">
                                    {cat}
                                </span>
                            </div>
                            <span className="text-xs font-semibold text-slate-600">
                                {count}
                            </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                                className="h-full rounded-full bg-ustp-gold/60 transition-all duration-500"
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </div>
                );
            })}
            {sorted.length === 0 && (
                <p className="py-4 text-center text-xs text-slate-400">
                    No items yet
                </p>
            )}
        </div>
    );
}

export default function InventoryIndex({
    items,
    filters,
    stats,
    options,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [category, setCategory] = useState(filters.category ?? 'all');
    const [condition, setCondition] = useState(filters.condition ?? 'all');
    const [status, setStatus] = useState(filters.status ?? 'all');
    const [campus, setCampus] = useState(filters.campus ?? 'all');
    const [endUser, setEndUser] = useState(filters.end_user ?? '');
    const [documentType, setDocumentType] = useState(
        filters.document_type ?? 'all',
    );
    const [page, setPage] = useState(1);

    function applyFilters(overrides: Partial<Filters> = {}) {
        setPage(1);

        const next = {
            search: overrides.search ?? search,
            category: overrides.category ?? category,
            condition: overrides.condition ?? condition,
            status: overrides.status ?? status,
            campus: overrides.campus ?? campus,
            end_user: overrides.end_user ?? endUser,
            document_type: overrides.document_type ?? documentType,
        };

        router.get(
            '/inventory',
            {
                search: next.search || undefined,
                category: next.category !== 'all' ? next.category : undefined,
                condition:
                    next.condition !== 'all' ? next.condition : undefined,
                status: next.status !== 'all' ? next.status : undefined,
                campus: next.campus !== 'all' ? next.campus : undefined,
                end_user: next.end_user || undefined,
                document_type:
                    next.document_type !== 'all'
                        ? next.document_type
                        : undefined,
            },
            { preserveState: true, replace: true },
        );
    }

    function handleDelete(id: number) {
        if (confirm('Delete this inventory item? This cannot be undone.')) {
            router.delete(`/inventory/${id}`);
        }
    }

    function handleMarkDisposal(id: number) {
        if (
            confirm(
                'Mark this item for disposal? It has reached its service life.',
            )
        ) {
            router.patch(`/inventory/${id}/mark-disposal`);
        }
    }

    const disposalReview = items.filter(
        (item) =>
            item.status === 'active' &&
            expiryState(item.expiration_date) === 'expired',
    );

    const totalCount = items.length;

    const pageSize = 20;
    const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
    const currentPage = Math.min(page, pageCount);
    const firstItem = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const lastItem = Math.min(currentPage * pageSize, totalCount);
    const visibleItems = items.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize,
    );

    const hasActiveFilters =
        search ||
        category !== 'all' ||
        condition !== 'all' ||
        status !== 'all' ||
        campus !== 'all' ||
        endUser ||
        documentType !== 'all';

    return (
        <>
            <Head title="Inventory" />

            <div className="relative min-h-full flex-1 overflow-hidden bg-slate-50 px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
                <div className="relative mx-auto max-w-7xl space-y-6">
                    <div className="flex justify-end">
                        <div className="flex flex-wrap items-center gap-3">
                            <Button
                                asChild
                                variant="outline"
                                className="h-10 border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-ustp-navy/30 hover:bg-slate-50"
                            >
                                <Link href="/inventory/expirations">
                                    <CalendarClock className="size-4" />
                                    Monitor Expiration
                                </Link>
                            </Button>

                            <Button
                                asChild
                                className="h-10 bg-ustp-gold px-4 text-sm font-semibold text-ustp-navy shadow-lg shadow-ustp-gold/10 transition-all hover:bg-ustp-gold-dark hover:text-white"
                            >
                                <Link href="/inventory/create">
                                    <Plus className="size-4" />
                                    Add Equipment
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {/* Stat cards */}
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="mb-3 flex items-center justify-between">
                                <p className="text-xs text-slate-400">
                                    Total Items
                                </p>
                                <div className="flex size-8 items-center justify-center rounded-lg bg-ustp-gold/10 text-ustp-gold">
                                    <Box className="size-4" />
                                </div>
                            </div>
                            <p className="text-2xl font-semibold text-slate-800">
                                {stats.total}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="mb-3 flex items-center justify-between">
                                <p className="text-xs text-slate-400">Active</p>
                                <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-400">
                                    <CheckCircle2 className="size-4" />
                                </div>
                            </div>
                            <p className="text-2xl font-semibold text-slate-800">
                                {stats.active}
                            </p>
                            <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className="h-full rounded-full bg-emerald-400"
                                    style={{
                                        width: `${stats.total > 0 ? (stats.active / stats.total) * 100 : 0}%`,
                                    }}
                                />
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="mb-3 flex items-center justify-between">
                                <p className="text-xs text-slate-400">
                                    Defective
                                </p>
                                <div className="flex size-8 items-center justify-center rounded-lg bg-red-400/10 text-red-400">
                                    <AlertTriangle className="size-4" />
                                </div>
                            </div>
                            <p className="text-2xl font-semibold text-slate-800">
                                {stats.defective}
                            </p>
                            <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className="h-full rounded-full bg-red-400"
                                    style={{
                                        width: `${stats.total > 0 ? (stats.defective / stats.total) * 100 : 0}%`,
                                    }}
                                />
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="mb-3 flex items-center justify-between">
                                <p className="text-xs text-slate-400">
                                    Under Repair
                                </p>
                                <div className="flex size-8 items-center justify-center rounded-lg bg-amber-400/10 text-amber-600">
                                    <Wrench className="size-4" />
                                </div>
                            </div>
                            <p className="text-2xl font-semibold text-slate-800">
                                {stats.under_repair}
                            </p>
                            <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className="h-full rounded-full bg-amber-400"
                                    style={{
                                        width: `${stats.total > 0 ? (stats.under_repair / stats.total) * 100 : 0}%`,
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Health overview + Category breakdown */}
                    <div className="grid gap-4 lg:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="mb-4 flex items-center gap-3">
                                <div className="flex size-9 items-center justify-center rounded-lg bg-ustp-gold/10">
                                    <CheckCircle2 className="size-4 text-ustp-gold" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-800">
                                        Condition Health
                                    </h3>
                                    <p className="text-[11px] text-slate-400">
                                        Equipment status overview
                                    </p>
                                </div>
                            </div>
                            <ConditionRingChart
                                working={stats.working}
                                defective={stats.defective}
                                underRepair={stats.under_repair}
                                total={stats.total}
                            />
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
                            <div className="mb-4 flex items-center gap-3">
                                <div className="flex size-9 items-center justify-center rounded-lg bg-ustp-gold/10">
                                    <Box className="size-4 text-ustp-gold" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-800">
                                        By Category
                                    </h3>
                                    <p className="text-[11px] text-slate-400">
                                        Distribution across equipment types
                                    </p>
                                </div>
                            </div>
                            <CategoryBreakdown items={items} />
                        </div>
                    </div>

                    {/* Disposal review */}
                    {disposalReview.length > 0 && (
                        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4 shadow-sm">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-9 items-center justify-center rounded-lg bg-red-100">
                                        <AlertTriangle className="size-4 text-red-500" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-semibold text-slate-800">
                                                Disposal Review
                                            </h3>
                                            <span className="rounded-full border border-red-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-red-600">
                                                {disposalReview.length}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                            Active items past their service life
                                            — review for disposal or
                                            replacement.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                {disposalReview.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex flex-col gap-2 rounded-xl border border-white/80 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="min-w-0">
                                            <Link
                                                href={`/inventory/${item.id}`}
                                                className="truncate text-sm font-medium text-slate-800 transition-colors hover:text-ustp-gold"
                                            >
                                                {item.item_name}
                                            </Link>
                                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                                                <span className="font-mono">
                                                    {item.property_no}
                                                </span>
                                                <span>
                                                    · Service life ended{' '}
                                                    {new Date(
                                                        item.expiration_date!,
                                                    ).toLocaleDateString(
                                                        'en-US',
                                                        {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                        },
                                                    )}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex shrink-0 items-center gap-1">
                                            <Button
                                                asChild
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 px-2.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                            >
                                                <Link
                                                    href={`/inventory/${item.id}`}
                                                >
                                                    View
                                                </Link>
                                            </Button>

                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 border border-red-200 px-2.5 text-xs text-red-600 hover:bg-red-100 hover:text-red-700"
                                                onClick={() =>
                                                    handleMarkDisposal(item.id)
                                                }
                                            >
                                                Mark for disposal
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Filters */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span className="mr-1 text-xs font-medium text-slate-500">
                                Source document
                            </span>
                            {[
                                ['all', 'All'],
                                ['ICS', 'ICS'],
                                ['PAR', 'PAR'],
                            ].map(([value, label]) => (
                                <Button
                                    key={value}
                                    type="button"
                                    size="sm"
                                    variant={
                                        documentType === value
                                            ? 'default'
                                            : 'outline'
                                    }
                                    onClick={() => {
                                        setDocumentType(value);
                                        applyFilters({ document_type: value });
                                    }}
                                    className={
                                        documentType === value
                                            ? 'bg-ustp-navy text-white hover:bg-ustp-navy-dark'
                                            : ''
                                    }
                                >
                                    {label}
                                </Button>
                            ))}
                        </div>
                        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                            <div className="relative">
                                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    placeholder="Search PN, serial, name..."
                                    className="h-10 border-slate-300 bg-white pl-9 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:border-ustp-gold/40 focus-visible:ring-1 focus-visible:ring-ustp-gold/20"
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        applyFilters({
                                            search: e.target.value,
                                        });
                                    }}
                                />
                            </div>

                            <Select
                                value={category}
                                onValueChange={(value) => {
                                    setCategory(value);
                                    applyFilters({ category: value });
                                }}
                            >
                                <SelectTrigger className="h-10 w-full border-slate-300 bg-white text-sm text-slate-600 focus:ring-1 focus:ring-ustp-gold/30">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="border-slate-200 bg-white text-slate-800">
                                    <SelectItem value="all">
                                        All categories
                                    </SelectItem>
                                    {options.categories.map((c) => (
                                        <SelectItem key={c} value={c}>
                                            {c}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={condition}
                                onValueChange={(value) => {
                                    setCondition(value);
                                    applyFilters({ condition: value });
                                }}
                            >
                                <SelectTrigger className="h-10 w-full border-slate-300 bg-white text-sm text-slate-600 focus:ring-1 focus:ring-ustp-gold/30">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="border-slate-200 bg-white text-slate-800">
                                    <SelectItem value="all">
                                        All conditions
                                    </SelectItem>
                                    <SelectItem value="working">
                                        Working
                                    </SelectItem>
                                    <SelectItem value="defective">
                                        Defective
                                    </SelectItem>
                                    <SelectItem value="under_repair">
                                        Under Repair
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={status}
                                onValueChange={(value) => {
                                    setStatus(value);
                                    applyFilters({ status: value });
                                }}
                            >
                                <SelectTrigger className="h-10 w-full border-slate-300 bg-white text-sm text-slate-600 focus:ring-1 focus:ring-ustp-gold/30">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="border-slate-200 bg-white text-slate-800">
                                    <SelectItem value="all">
                                        All statuses
                                    </SelectItem>
                                    <SelectItem value="active">
                                        Active
                                    </SelectItem>
                                    <SelectItem value="for_disposal">
                                        For Disposal
                                    </SelectItem>
                                    <SelectItem value="retired">
                                        Retired
                                    </SelectItem>
                                    <SelectItem value="disposed">
                                        Disposed
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={campus}
                                onValueChange={(value) => {
                                    setCampus(value);
                                    applyFilters({ campus: value });
                                }}
                            >
                                <SelectTrigger className="h-10 w-full border-slate-300 bg-white text-sm text-slate-600 focus:ring-1 focus:ring-ustp-gold/30">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="border-slate-200 bg-white text-slate-800">
                                    <SelectItem value="all">
                                        All item locations
                                    </SelectItem>
                                    {options.campuses.map((c) => (
                                        <SelectItem key={c} value={c}>
                                            {c}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <div className="relative">
                                <UserIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    list="inventory-end-users"
                                    placeholder="End user..."
                                    className="h-10 border-slate-300 bg-white pl-9 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:border-ustp-gold/40 focus-visible:ring-1 focus-visible:ring-ustp-gold/20"
                                    value={endUser}
                                    onChange={(e) => {
                                        setEndUser(e.target.value);
                                        applyFilters({
                                            end_user: e.target.value,
                                        });
                                    }}
                                />
                                <datalist id="inventory-end-users">
                                    {options.endUsers.map((u) => (
                                        <option key={u} value={u} />
                                    ))}
                                </datalist>
                            </div>
                        </div>
                    </div>

                    {/* Empty state */}
                    {items.length === 0 ? (
                        <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 text-center">
                            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-ustp-gold/10 text-ustp-gold">
                                <Box className="size-6" />
                            </div>

                            <h2 className="text-sm font-medium text-slate-800">
                                {hasActiveFilters
                                    ? 'No inventory items found'
                                    : 'No inventory items yet'}
                            </h2>

                            <p className="mt-1.5 max-w-sm text-xs leading-5 text-slate-400">
                                {hasActiveFilters
                                    ? 'Try changing your filters or search terms.'
                                    : 'Add your first equipment to start tracking inventory.'}
                            </p>

                            {!hasActiveFilters && (
                                <Button
                                    asChild
                                    size="sm"
                                    className="mt-5 bg-ustp-gold text-ustp-navy shadow-lg shadow-ustp-gold/10 transition-all hover:bg-ustp-gold-dark hover:text-white"
                                >
                                    <Link href="/inventory/create">
                                        <Plus className="size-4" />
                                        Add First Item
                                    </Link>
                                </Button>
                            )}
                        </div>
                    ) : (
                        /* Table */
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-312.5 text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50">
                                            <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                Equipment
                                            </th>
                                            <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                Property No.
                                            </th>
                                            <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                Category
                                            </th>
                                            <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                Serial No.
                                            </th>
                                            <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                Location
                                            </th>
                                            <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                End User
                                            </th>
                                            <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                Service Life
                                            </th>
                                            <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                Condition
                                            </th>
                                            <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                Status
                                            </th>
                                            <th className="w-28 px-5 py-3.5" />
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {visibleItems.map((item) => {
                                            const cc =
                                                conditionConfig[
                                                    item.condition
                                                ] ?? conditionConfig.working;
                                            const expiry = expiryState(
                                                item.expiration_date,
                                            );
                                            const category =
                                                resolveCategory(item);
                                            const CatIcon =
                                                categoryIcons[category] ?? Box;
                                            const catColor =
                                                categoryColors[category] ??
                                                'bg-slate-50 text-slate-400';
                                            const locationParts = item.location;

                                            return (
                                                <tr
                                                    key={item.id}
                                                    className="group border-b border-slate-200 transition-colors last:border-0 hover:bg-slate-50"
                                                >
                                                    {/* Equipment */}
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${catColor}`}
                                                            >
                                                                <CatIcon className="size-4" />
                                                            </div>

                                                            <div className="min-w-0">
                                                                <Link
                                                                    href={`/inventory/${item.id}`}
                                                                    className="truncate font-medium text-slate-800 transition-colors hover:text-ustp-gold"
                                                                >
                                                                    {
                                                                        item.item_name
                                                                    }
                                                                </Link>

                                                                <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                                                                    {item.brand && (
                                                                        <span className="flex items-center gap-1">
                                                                            <Tag className="size-3" />
                                                                            {
                                                                                item.brand
                                                                            }
                                                                        </span>
                                                                    )}
                                                                    {item.model && (
                                                                        <span className="text-slate-300">
                                                                            ·{' '}
                                                                            {
                                                                                item.model
                                                                            }
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Property No */}
                                                    <td className="px-5 py-4">
                                                        <span className="font-mono text-[11px] text-slate-400">
                                                            {item.property_no}
                                                        </span>
                                                    </td>

                                                    {/* Category */}
                                                    <td className="px-5 py-4">
                                                        <span
                                                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${catColor}`}
                                                        >
                                                            {category}
                                                        </span>
                                                    </td>

                                                    {/* Serial No */}
                                                    <td className="px-5 py-4">
                                                        {item.serial_no ? (
                                                            <span className="font-mono text-[11px] text-slate-400">
                                                                {item.serial_no}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-300">
                                                                —
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Location */}
                                                    <td className="px-5 py-4">
                                                        {locationParts ? (
                                                            <span className="flex items-center gap-1.5 text-xs text-slate-400">
                                                                <MapPin className="size-3 shrink-0 text-slate-300" />
                                                                {locationParts}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-300">
                                                                —
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* End User */}
                                                    <td className="px-5 py-4">
                                                        {item.end_user ? (
                                                            <span className="text-xs text-slate-500">
                                                                {item.end_user}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-300">
                                                                —
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Service Life */}
                                                    <td className="px-5 py-4">
                                                        {item.expiration_date ? (
                                                            <div className="flex flex-col items-start gap-1">
                                                                <span className="text-xs text-slate-500">
                                                                    {new Date(
                                                                        item.expiration_date,
                                                                    ).toLocaleDateString(
                                                                        'en-US',
                                                                        {
                                                                            month: 'short',
                                                                            day: 'numeric',
                                                                            year: 'numeric',
                                                                        },
                                                                    )}
                                                                </span>
                                                                {expiry &&
                                                                    expiry !==
                                                                        'valid' && (
                                                                        <span
                                                                            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                                                                                expiry ===
                                                                                'expired'
                                                                                    ? 'border-red-200 bg-red-50 text-red-600'
                                                                                    : 'border-amber-200 bg-amber-50 text-amber-700'
                                                                            }`}
                                                                        >
                                                                            {expiry ===
                                                                            'expired'
                                                                                ? 'Expired'
                                                                                : 'Expiring Soon'}
                                                                        </span>
                                                                    )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-300">
                                                                —
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Condition */}
                                                    <td className="px-5 py-4">
                                                        <span
                                                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${cc.badge}`}
                                                        >
                                                            <span
                                                                className={`size-1.5 rounded-full ${cc.dot}`}
                                                            />
                                                            {conditionLabels[
                                                                item.condition
                                                            ] ??
                                                                item.condition.replace(
                                                                    '_',
                                                                    ' ',
                                                                )}
                                                        </span>
                                                    </td>

                                                    {/* Status */}
                                                    <td className="px-5 py-4">
                                                        <span
                                                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${statusConfig[item.status] ?? 'border-slate-200 bg-slate-50 text-slate-500'}`}
                                                        >
                                                            {statusLabels[
                                                                item.status
                                                            ] ?? item.status}
                                                        </span>
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Link
                                                                href={`/inventory/${item.id}`}
                                                                className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-ustp-gold/10 hover:text-ustp-gold"
                                                            >
                                                                <ArrowUpRight className="size-3.5" />
                                                            </Link>

                                                            <Button
                                                                asChild
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 px-2.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                                            >
                                                                <Link
                                                                    href={`/inventory/${item.id}/edit`}
                                                                >
                                                                    Edit
                                                                </Link>
                                                            </Button>

                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="size-8 text-slate-400 hover:bg-red-400/10 hover:text-red-400"
                                                                onClick={() =>
                                                                    handleDelete(
                                                                        item.id,
                                                                    )
                                                                }
                                                            >
                                                                <Trash2 className="size-3.5" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Table footer */}
                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
                                <p className="text-[11px] text-slate-400">
                                    Showing {firstItem}–{lastItem} of{' '}
                                    {totalCount}{' '}
                                    {totalCount === 1 ? 'record' : 'records'}
                                </p>

                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={currentPage === 1}
                                        onClick={() =>
                                            setPage((value) =>
                                                Math.max(1, value - 1),
                                            )
                                        }
                                        className="h-7 px-2.5 text-[11px]"
                                    >
                                        <ChevronLeft className="size-3.5" />
                                        Prev
                                    </Button>

                                    <span className="text-[11px] text-slate-500">
                                        Page {currentPage} of {pageCount}
                                    </span>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={currentPage === pageCount}
                                        onClick={() =>
                                            setPage((value) =>
                                                Math.min(pageCount, value + 1),
                                            )
                                        }
                                        className="h-7 px-2.5 text-[11px]"
                                    >
                                        Next
                                        <ChevronRight className="size-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
