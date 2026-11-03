import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    Building2,
    Calendar,
    CheckCircle2,
    Clock3,
    MapPin,
    Pencil,
    Plus,
    Search,
    Trash2,
    Users,
    Wrench,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { BackButton } from '@/components/back-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type FacilityRow = {
    id: number;
    facility_name: string;
    facility_type: string;
    capacity: number | null;
    location: string | null;
    availability_status: string;
    bookings_count: number;
};

type Props = {
    facilities: FacilityRow[];
    status?: string | null;
    error?: string | null;
    stats: {
        total: number;
        available: number;
        unavailable: number;
        total_bookings: number;
    };
};

const facilityTypeLabel: Record<string, string> = {
    computer_lab: 'Computer Lab',
    av_room: 'AV Room',
};

const availabilityConfig: Record<
    string,
    { label: string; badge: string; icon: React.ElementType }
> = {
    available: {
        label: 'Available',
        badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        icon: CheckCircle2,
    },
    unavailable: {
        label: 'Unavailable',
        badge: 'border-rose-200 bg-rose-50 text-rose-600',
        icon: Clock3,
    },
    under_maintenance: {
        label: 'Under Maintenance',
        badge: 'border-amber-200 bg-amber-50 text-amber-700',
        icon: Wrench,
    },
};

export default function FacilitiesIndex({
    facilities,
    status,
    error,
    stats,
}: Props) {
    const [search, setSearch] = useState('');

    const query = search.trim().toLowerCase();
    const filteredFacilities = query
        ? facilities.filter((facility) =>
              [
                  facility.facility_name,
                  facilityTypeLabel[facility.facility_type] ?? '',
                  facility.facility_type,
                  facility.location ?? '',
              ].some((value) => value.toLowerCase().includes(query)),
          )
        : facilities;

    function handleDelete(id: number) {
        if (confirm('Delete this facility? This cannot be undone.')) {
            router.delete(`/facilities/${id}`);
        }
    }

    return (
        <>
            <Head title="Facilities" />

            <div className="min-h-full flex-1 bg-slate-50 text-slate-800">
                <div className="relative flex flex-1 flex-col gap-6 overflow-hidden p-4 md:p-6 lg:p-8">
                    <div className="flex justify-end">
                        <BackButton href="/bookings" />
                    </div>

                    <div className="flex justify-end">
                        <Button
                            asChild
                            className="h-10 bg-ustp-gold px-4 text-sm font-semibold text-ustp-navy shadow-lg shadow-ustp-gold/10 transition-all hover:bg-ustp-gold-dark hover:text-white"
                        >
                            <Link href="/facilities/create">
                                <Plus className="size-4" />
                                Add Facility
                            </Link>
                        </Button>
                    </div>

                    {status && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                            {status}
                        </div>
                    )}

                    {error && (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {error}
                        </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        {[
                            {
                                label: 'Total Facilities',
                                value: stats.total,
                                icon: Building2,
                                bg: 'bg-ustp-gold/10',
                                color: 'text-ustp-gold',
                            },
                            {
                                label: 'Available',
                                value: stats.available,
                                icon: CheckCircle2,
                                bg: 'bg-emerald-400/10',
                                color: 'text-emerald-500',
                            },
                            {
                                label: 'Unavailable / Maintenance',
                                value: stats.unavailable,
                                icon: Wrench,
                                bg: 'bg-amber-400/10',
                                color: 'text-amber-600',
                            },
                            {
                                label: 'Total Bookings',
                                value: stats.total_bookings,
                                icon: Calendar,
                                bg: 'bg-ustp-blue-accent/15',
                                color: 'text-ustp-light-blue',
                            },
                        ].map((card) => (
                            <div
                                key={card.label}
                                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                            >
                                <div className="mb-3 flex items-center justify-between">
                                    <p className="text-xs text-slate-400">
                                        {card.label}
                                    </p>
                                    <div
                                        className={`flex size-8 items-center justify-center rounded-lg ${card.bg} ${card.color}`}
                                    >
                                        <card.icon className="size-4" />
                                    </div>
                                </div>
                                <p className="text-2xl font-semibold text-slate-800">
                                    {card.value}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Empty state */}
                    {facilities.length === 0 ? (
                        <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 text-center">
                            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-ustp-gold/10 text-ustp-gold">
                                <Building2 className="size-6" />
                            </div>

                            <h2 className="text-sm font-medium text-slate-800">
                                No facilities yet
                            </h2>

                            <p className="mt-1.5 max-w-sm text-xs leading-5 text-slate-400">
                                Add your first facility to start accepting
                                booking requests.
                            </p>

                            <Button
                                asChild
                                size="sm"
                                className="mt-5 bg-ustp-gold text-ustp-navy shadow-lg shadow-ustp-gold/10 transition-all hover:bg-ustp-gold-dark hover:text-white"
                            >
                                <Link href="/facilities/create">
                                    <Plus className="size-4" />
                                    Add First Facility
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <>
                            {/* Search */}
                            <div className="relative w-full sm:max-w-sm">
                                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />

                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by name, type, or location..."
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

                            {filteredFacilities.length === 0 ? (
                                <div className="flex min-h-60 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 text-center">
                                    <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                                        <Search className="size-5" />
                                    </div>

                                    <h2 className="text-sm font-medium text-slate-800">
                                        No facilities found
                                    </h2>

                                    <p className="mt-1.5 max-w-sm text-xs leading-5 text-slate-400">
                                        No facility matches {search.trim()}. Try
                                        a different keyword.
                                    </p>

                                    <button
                                        type="button"
                                        onClick={() => setSearch('')}
                                        className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                                    >
                                        Clear search
                                    </button>
                                </div>
                            ) : (
                                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-200 text-sm">
                                            <thead>
                                                <tr className="border-b border-slate-200 bg-slate-50">
                                                    <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                        Facility
                                                    </th>
                                                    <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                        Type
                                                    </th>
                                                    <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                        Location
                                                    </th>
                                                    <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                        Capacity
                                                    </th>
                                                    <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                        Bookings
                                                    </th>
                                                    <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                        Status
                                                    </th>
                                                    <th className="w-32 px-5 py-3.5" />
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {filteredFacilities.map(
                                                    (facility) => {
                                                        const ac =
                                                            availabilityConfig[
                                                                facility
                                                                    .availability_status
                                                            ] ??
                                                            availabilityConfig.available;
                                                        const StatusIcon =
                                                            ac.icon;

                                                        return (
                                                            <tr
                                                                key={
                                                                    facility.id
                                                                }
                                                                className="group border-b border-slate-200 transition-colors last:border-0 hover:bg-slate-50"
                                                            >
                                                                <td className="px-5 py-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ustp-gold/10 text-ustp-gold">
                                                                            <Building2 className="size-4" />
                                                                        </div>
                                                                        <span className="font-medium text-slate-800">
                                                                            {
                                                                                facility.facility_name
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                </td>

                                                                <td className="px-5 py-4">
                                                                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                                                                        {facilityTypeLabel[
                                                                            facility
                                                                                .facility_type
                                                                        ] ??
                                                                            facility.facility_type}
                                                                    </span>
                                                                </td>

                                                                <td className="px-5 py-4">
                                                                    {facility.location ? (
                                                                        <span className="flex items-center gap-1.5 text-xs text-slate-400">
                                                                            <MapPin className="size-3 shrink-0 text-slate-300" />
                                                                            {
                                                                                facility.location
                                                                            }
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-slate-300">
                                                                            —
                                                                        </span>
                                                                    )}
                                                                </td>

                                                                <td className="px-5 py-4">
                                                                    {facility.capacity ? (
                                                                        <span className="flex items-center gap-1.5 text-xs text-slate-500">
                                                                            <Users className="size-3 text-slate-300" />
                                                                            {
                                                                                facility.capacity
                                                                            }
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-slate-300">
                                                                            —
                                                                        </span>
                                                                    )}
                                                                </td>

                                                                <td className="px-5 py-4">
                                                                    <span className="text-xs font-medium text-slate-600">
                                                                        {
                                                                            facility.bookings_count
                                                                        }
                                                                    </span>
                                                                </td>

                                                                <td className="px-5 py-4">
                                                                    <span
                                                                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${ac.badge}`}
                                                                    >
                                                                        <StatusIcon className="size-3" />
                                                                        {
                                                                            ac.label
                                                                        }
                                                                    </span>
                                                                </td>

                                                                <td className="px-5 py-4">
                                                                    <div className="flex items-center justify-end gap-1">
                                                                        <Button
                                                                            asChild
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-8 px-2.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                                                        >
                                                                            <Link
                                                                                href={`/facilities/${facility.id}/edit`}
                                                                            >
                                                                                <Pencil className="size-3.5" />
                                                                                Edit
                                                                            </Link>
                                                                        </Button>

                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="size-8 text-slate-400 hover:bg-red-400/10 hover:text-red-400"
                                                                            disabled={
                                                                                facility.bookings_count >
                                                                                0
                                                                            }
                                                                            title={
                                                                                facility.bookings_count >
                                                                                0
                                                                                    ? 'Facility has bookings'
                                                                                    : undefined
                                                                            }
                                                                            onClick={() =>
                                                                                handleDelete(
                                                                                    facility.id,
                                                                                )
                                                                            }
                                                                        >
                                                                            <Trash2 className="size-3.5" />
                                                                        </Button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    },
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3">
                                        <p className="text-xs text-slate-400">
                                            {query
                                                ? `${filteredFacilities.length} of ${facilities.length} facilities`
                                                : `${facilities.length} facilit${facilities.length === 1 ? 'y' : 'ies'}`}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {facilities.some((f) => f.bookings_count > 0) && (
                        <p className="flex items-center gap-1.5 text-xs text-slate-400">
                            <AlertTriangle className="size-3.5 text-amber-500" />
                            Facilities with existing bookings cannot be deleted.
                            Mark them as unavailable instead.
                        </p>
                    )}
                </div>
            </div>
        </>
    );
}
