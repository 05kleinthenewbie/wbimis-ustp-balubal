import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowUpRight,
    Box,
    CalendarClock,
    CheckCircle2,
    Search,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { BackButton } from '@/components/back-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type ExpirationRow = {
    id: number;
    property_no: string;
    item_name: string;
    category: string | null;
    brand: string | null;
    model: string | null;
    end_user: string | null;
    department: string | null;
    campus: string | null;
    status: string;
    condition: string;
    purchase_date: string | null;
    expiration_date: string;
    expiration_type: string | null;
};

type Props = {
    items: ExpirationRow[];
    categoryGroups: Record<string, string[]>;
    expirationTypes: string[];
};

type TabKey = 'soon' | 'expired' | 'all';

function expiryState(dateStr: string): 'expired' | 'soon' | 'valid' {
    const expiry = new Date(`${dateStr.slice(0, 10)}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (expiry < today) {
        return 'expired';
    }

    const soon = new Date(today);
    soon.setDate(soon.getDate() + 30);

    return expiry <= soon ? 'soon' : 'valid';
}

function daysLeft(dateStr: string): number {
    const expiry = new Date(`${dateStr.slice(0, 10)}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Math.round((expiry.getTime() - today.getTime()) / 86400000);
}

function formatDate(dateStr: string): string {
    return new Date(`${dateStr.slice(0, 10)}T00:00:00`).toLocaleDateString(
        'en-US',
        {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        },
    );
}

const stateBadge: Record<
    'expired' | 'soon' | 'valid',
    { badge: string; label: string }
> = {
    expired: {
        badge: 'border-red-200 bg-red-50 text-red-600',
        label: 'Expired',
    },
    soon: {
        badge: 'border-amber-200 bg-amber-50 text-amber-700',
        label: 'Expiring Soon',
    },
    valid: {
        badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        label: 'Valid',
    },
};

const tabs: { key: TabKey; label: string }[] = [
    { key: 'soon', label: 'Expiring Soon' },
    { key: 'expired', label: 'Expired' },
    { key: 'all', label: 'All Tracked' },
];

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

function resolveCategory(item: ExpirationRow): string | null {
    if (!item.category) {
        return null;
    }

    return legacyCategoryAliases[item.category] ?? item.category;
}

const inputClass =
    'h-10 border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus-visible:border-ustp-gold/40 focus-visible:ring-1 focus-visible:ring-ustp-gold/20';

const selectClass =
    'h-10 w-full border-slate-300 bg-white text-slate-800 focus:ring-1 focus:ring-ustp-gold/30';

export default function InventoryExpirations({
    items,
    categoryGroups,
    expirationTypes,
}: Props) {
    const [tab, setTab] = useState<TabKey>('soon');
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('all');
    const [expirationType, setExpirationType] = useState('all');

    const counts = useMemo(() => {
        let soon = 0;
        let expired = 0;

        for (const item of items) {
            const state = expiryState(item.expiration_date);

            if (state === 'soon') {
                soon += 1;
            } else if (state === 'expired') {
                expired += 1;
            }
        }

        return { soon, expired, all: items.length };
    }, [items]);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();

        return items.filter((item) => {
            const state = expiryState(item.expiration_date);

            if (tab === 'soon' && state !== 'soon') {
                return false;
            }

            if (tab === 'expired' && state !== 'expired') {
                return false;
            }

            if (category !== 'all' && resolveCategory(item) !== category) {
                return false;
            }

            if (
                expirationType !== 'all' &&
                (item.expiration_type ?? '') !== expirationType
            ) {
                return false;
            }

            if (!term) {
                return true;
            }

            return (
                item.item_name.toLowerCase().includes(term) ||
                item.property_no.toLowerCase().includes(term) ||
                (item.brand ?? '').toLowerCase().includes(term) ||
                (item.model ?? '').toLowerCase().includes(term) ||
                (item.end_user ?? '').toLowerCase().includes(term)
            );
        });
    }, [items, tab, search, category, expirationType]);

    return (
        <>
            <Head title="Monitor Expiration" />

            <div className="relative min-h-full flex-1 overflow-hidden bg-slate-50 px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
                <div className="relative mx-auto max-w-7xl space-y-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <BackButton href="/inventory" />
                        </div>

                        <Button
                            asChild
                            className="h-10 bg-ustp-gold px-4 text-sm font-semibold text-ustp-navy shadow-lg shadow-ustp-gold/10 transition-all hover:bg-ustp-gold-dark hover:text-white"
                        >
                            <Link href="/inventory/create">
                                <Box className="size-4" />
                                Add Equipment
                            </Link>
                        </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="mb-3 flex items-center justify-between">
                                <p className="text-xs text-slate-400">
                                    Expiring Soon
                                </p>
                                <div className="flex size-8 items-center justify-center rounded-lg bg-amber-400/10 text-amber-600">
                                    <CalendarClock className="size-4" />
                                </div>
                            </div>
                            <p className="text-2xl font-semibold text-slate-800">
                                {counts.soon}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-400">
                                Within the next 30 days
                            </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="mb-3 flex items-center justify-between">
                                <p className="text-xs text-slate-400">
                                    Expired
                                </p>
                                <div className="flex size-8 items-center justify-center rounded-lg bg-red-400/10 text-red-500">
                                    <AlertTriangle className="size-4" />
                                </div>
                            </div>
                            <p className="text-2xl font-semibold text-slate-800">
                                {counts.expired}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-400">
                                Needs renewal or disposal review
                            </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="mb-3 flex items-center justify-between">
                                <p className="text-xs text-slate-400">
                                    Items Tracked
                                </p>
                                <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-500">
                                    <CheckCircle2 className="size-4" />
                                </div>
                            </div>
                            <p className="text-2xl font-semibold text-slate-800">
                                {counts.all}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-400">
                                With an expiration date set
                            </p>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex flex-wrap gap-2">
                        {tabs.map((t) => {
                            const count =
                                t.key === 'soon'
                                    ? counts.soon
                                    : t.key === 'expired'
                                      ? counts.expired
                                      : counts.all;

                            return (
                                <button
                                    key={t.key}
                                    type="button"
                                    onClick={() => setTab(t.key)}
                                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                                        tab === t.key
                                            ? 'border-ustp-navy bg-ustp-navy text-white'
                                            : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-800'
                                    }`}
                                >
                                    {t.label}
                                    <span
                                        className={`rounded-full px-1.5 py-0.5 text-[11px] ${
                                            tab === t.key
                                                ? 'bg-white/15 text-white'
                                                : 'bg-slate-100 text-slate-500'
                                        }`}
                                    >
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Filters */}
                    <div className="grid gap-3 md:grid-cols-3">
                        <div className="relative">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search item, property no., or user..."
                                className={`${inputClass} pl-9`}
                            />
                        </div>

                        <Select
                            value={category}
                            onValueChange={(value) => setCategory(value)}
                        >
                            <SelectTrigger className={selectClass}>
                                <SelectValue placeholder="All categories" />
                            </SelectTrigger>
                            <SelectContent className="border-slate-200 bg-white text-slate-800">
                                <SelectItem value="all">
                                    All categories
                                </SelectItem>
                                {Object.entries(categoryGroups).map(
                                    ([group, options]) => (
                                        <SelectGroup key={group}>
                                            <SelectLabel className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                                                {group}
                                            </SelectLabel>
                                            {options.map((c) => (
                                                <SelectItem key={c} value={c}>
                                                    {c}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    ),
                                )}
                            </SelectContent>
                        </Select>

                        <Select
                            value={expirationType}
                            onValueChange={(value) => setExpirationType(value)}
                        >
                            <SelectTrigger className={selectClass}>
                                <SelectValue placeholder="All expiration types" />
                            </SelectTrigger>
                            <SelectContent className="border-slate-200 bg-white text-slate-800">
                                <SelectItem value="all">
                                    All expiration types
                                </SelectItem>
                                {expirationTypes.map((t) => (
                                    <SelectItem key={t} value={t}>
                                        {t}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Desktop table */}
                    <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                                <tr>
                                    <th className="px-4 py-3">Item</th>
                                    <th className="px-4 py-3">Category</th>
                                    <th className="px-4 py-3">
                                        Expiration Type
                                    </th>
                                    <th className="px-4 py-3">Expires</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">End User</th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map((item) => {
                                    const state = expiryState(
                                        item.expiration_date,
                                    );
                                    const left = daysLeft(item.expiration_date);

                                    return (
                                        <tr
                                            key={item.id}
                                            className="transition-colors hover:bg-slate-50/70"
                                        >
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-slate-800">
                                                    {item.item_name}
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    {item.property_no}
                                                    {item.brand
                                                        ? ` · ${item.brand}`
                                                        : ''}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {resolveCategory(item) ?? '—'}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {item.expiration_type ?? '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-slate-700">
                                                    {formatDate(
                                                        item.expiration_date,
                                                    )}
                                                </p>
                                                <p
                                                    className={`text-xs ${
                                                        state === 'expired'
                                                            ? 'text-red-500'
                                                            : state === 'soon'
                                                              ? 'text-amber-600'
                                                              : 'text-slate-400'
                                                    }`}
                                                >
                                                    {state === 'expired'
                                                        ? `${Math.abs(left)} days ago`
                                                        : `in ${left} days`}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${stateBadge[state].badge}`}
                                                >
                                                    {stateBadge[state].label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {item.end_user ?? '—'}
                                                {item.department && (
                                                    <span className="block text-xs text-slate-400">
                                                        {item.department}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Link
                                                    href={`/inventory/${item.id}`}
                                                    className="inline-flex items-center gap-1 text-xs font-medium text-ustp-navy hover:underline"
                                                >
                                                    View
                                                    <ArrowUpRight className="size-3.5" />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {filtered.length === 0 && (
                            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                                <CalendarClock className="size-6 text-slate-300" />
                                <p className="text-sm text-slate-500">
                                    No items match this view.
                                </p>
                                <p className="text-xs text-slate-400">
                                    Switch tabs or adjust the filters above.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Mobile cards */}
                    <div className="space-y-3 md:hidden">
                        {filtered.map((item) => {
                            const state = expiryState(item.expiration_date);
                            const left = daysLeft(item.expiration_date);

                            return (
                                <Link
                                    key={item.id}
                                    href={`/inventory/${item.id}`}
                                    className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-medium text-slate-800">
                                                {item.item_name}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                {item.property_no}
                                            </p>
                                        </div>
                                        <span
                                            className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${stateBadge[state].badge}`}
                                        >
                                            {stateBadge[state].label}
                                        </span>
                                    </div>

                                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <p className="text-slate-400">
                                                Expires
                                            </p>
                                            <p className="font-medium text-slate-700">
                                                {formatDate(
                                                    item.expiration_date,
                                                )}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-slate-400">
                                                Type
                                            </p>
                                            <p className="font-medium text-slate-700">
                                                {item.expiration_type ?? '—'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-slate-400">
                                                Category
                                            </p>
                                            <p className="font-medium text-slate-700">
                                                {resolveCategory(item) ?? '—'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-slate-400">
                                                Time left
                                            </p>
                                            <p
                                                className={`font-medium ${
                                                    state === 'expired'
                                                        ? 'text-red-500'
                                                        : state === 'soon'
                                                          ? 'text-amber-600'
                                                          : 'text-slate-700'
                                                }`}
                                            >
                                                {state === 'expired'
                                                    ? `${Math.abs(left)} days ago`
                                                    : `${left} days`}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}

                        {filtered.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
                                <p className="text-sm text-slate-500">
                                    No items match this view.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
