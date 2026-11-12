import { Head, Link } from '@inertiajs/react';
import {
    ArrowUpRight,
    Calendar,
    Plus,
    Search,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { BookingCalendar } from '@/components/booking-calendar';
import type { CalendarBooking } from '@/components/booking-calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type BookingItem = {
    id: number;
    booking_date: string;
    start_time: string;
    end_time: string;
    booking_status: string;
    purpose: string | null;
    user: { name: string };
    facility: {
        facility_name: string;
        facility_type: string;
        location: string | null;
    };
};

type Props = {
    bookings: BookingItem[];
    stats: {
        total: number;
        pending: number;
        approved: number;
        rejected: number;
        completed: number;
    };
    calendarBookings: CalendarBooking[];
    facilities: {
        id: number;
        facility_name: string;
    }[];
};

const statusBadge: Record<string, string> = {
    pending: 'border-amber-200 bg-amber-50 text-amber-700',
    approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    rejected: 'border-rose-200 bg-rose-50 text-rose-600',
    cancelled: 'border-slate-200 bg-slate-50 text-slate-600',
    completed: 'border-sky-200 bg-sky-50 text-sky-700',
};

const facilityTypeLabel: Record<string, string> = {
    computer_lab: 'Computer Lab',
    av_room: 'AV Room',
};

export default function BookingsIndex({
    bookings,
    stats,
    calendarBookings,
    facilities,
}: Props) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>(() => {
        if (typeof window === 'undefined') {
            return 'all';
        }

        return (
            new URLSearchParams(window.location.search).get('status') ?? 'all'
        );
    });
    const [todayOnly, setTodayOnly] = useState<boolean>(() => {
        if (typeof window === 'undefined') {
            return false;
        }

        return new URLSearchParams(window.location.search).get('today') === '1';
    });

    const filtered = bookings.filter((booking) => {
        const q = search.toLowerCase();
        const matchesSearch =
            booking.facility.facility_name.toLowerCase().includes(q) ||
            booking.user.name.toLowerCase().includes(q) ||
            String(booking.id).includes(q);
        const matchesStatus =
            statusFilter === 'all' || booking.booking_status === statusFilter;
        const matchesToday =
            !todayOnly ||
            booking.booking_date === new Date().toISOString().slice(0, 10);

        return matchesSearch && matchesStatus && matchesToday;
    });

    return (
        <>
            <Head title="Facility Booking" />

            <div className="min-h-full flex-1 bg-slate-50 text-slate-800">
                <div className="relative flex flex-1 flex-col gap-6 overflow-hidden p-4 md:p-6 lg:p-8">
                    <div className="flex justify-end">
                        <Button
                            asChild
                            className="h-10 bg-ustp-gold px-4 text-sm font-semibold text-ustp-navy shadow-lg shadow-ustp-gold/10 transition-all hover:bg-ustp-gold-dark hover:text-white"
                        >
                            <Link href="/bookings/create">
                                <Plus className="mr-2 size-4" />
                                New Booking
                            </Link>
                        </Button>
                    </div>

                    {/* Availability Calendar */}
                    <BookingCalendar
                        bookings={calendarBookings}
                        facilities={facilities}
                        showFacilityFilter
                        showRequester
                    />

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                        {[
                            {
                                key: 'all',
                                label: 'Total Bookings',
                                value: stats.total,
                            },
                            {
                                key: 'pending',
                                label: 'Pending',
                                value: stats.pending,
                            },
                            {
                                key: 'approved',
                                label: 'Approved',
                                value: stats.approved,
                            },
                            {
                                key: 'completed',
                                label: 'Completed',
                                value: stats.completed,
                            },
                            {
                                key: 'rejected',
                                label: 'Rejected',
                                value: stats.rejected,
                            },
                        ].map((card) => (
                            <button
                                key={card.key}
                                type="button"
                                aria-pressed={statusFilter === card.key}
                                onClick={() =>
                                    setStatusFilter((current) =>
                                        current === card.key &&
                                        card.key !== 'all'
                                            ? 'all'
                                            : card.key,
                                    )
                                }
                                className={`cursor-pointer rounded-2xl border p-4 text-left shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ustp-navy ${
                                    statusFilter === card.key
                                        ? 'border-ustp-navy bg-ustp-navy/5 ring-1 ring-ustp-navy'
                                        : 'border-slate-200 bg-white hover:border-slate-400'
                                }`}
                            >
                                <p className="text-2xl font-semibold text-slate-800">
                                    {card.value}
                                </p>
                                <p className="text-[11px] text-slate-400">
                                    {card.label}
                                </p>
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
                                placeholder="Search by facility, requester, or ID..."
                                className="h-10 border-slate-300 bg-white pl-9 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:border-ustp-gold/40 focus-visible:ring-1 focus-visible:ring-ustp-gold/20"
                            />

                            {search && (
                                <button
                                    onClick={() => setSearch('')}
                                    className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <XCircle className="size-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            {(statusFilter !== 'all' ||
                                search ||
                                todayOnly) && (
                                <button
                                    onClick={() => {
                                        setStatusFilter('all');
                                        setSearch('');
                                        setTodayOnly(false);
                                    }}
                                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                                >
                                    <XCircle className="size-3" />
                                    Clear filters
                                </button>
                            )}

                            <div className="text-[11px] text-slate-400">
                                {filtered.length} booking
                                {filtered.length !== 1 ? 's' : ''}
                            </div>
                        </div>
                    </div>

                    {/* Empty */}
                    {filtered.length === 0 ? (
                        <div className="relative flex min-h-90 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 text-center">
                            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-ustp-gold/10 text-ustp-gold">
                                <Calendar className="size-6" />
                            </div>

                            <h2 className="text-sm font-medium text-slate-800">
                                {search || statusFilter !== 'all'
                                    ? 'No matching bookings'
                                    : 'No bookings yet'}
                            </h2>

                            <p className="mt-1.5 max-w-sm text-xs leading-5 text-slate-400">
                                {search || statusFilter !== 'all'
                                    ? 'Try adjusting your search or filter criteria.'
                                    : 'Facility booking requests will appear here.'}
                            </p>

                            {search || statusFilter !== 'all' ? null : (
                                <Button
                                    asChild
                                    variant="outline"
                                    className="mt-5 border-ustp-gold/30 bg-transparent text-ustp-gold hover:bg-ustp-gold/10 hover:text-ustp-gold"
                                >
                                    <Link href="/bookings/create">
                                        <Plus className="size-4" />
                                        Create your first booking
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
                                                Facility
                                            </th>
                                            <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                Requested by
                                            </th>
                                            <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                Date & Time
                                            </th>
                                            <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                Status
                                            </th>
                                            <th className="w-16 px-5 py-3.5" />
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {filtered.map((booking) => (
                                            <tr
                                                key={booking.id}
                                                className="border-b border-slate-200 transition-colors last:border-0 hover:bg-slate-50"
                                            >
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div>
                                                            <p className="font-medium text-slate-800">
                                                                {
                                                                    booking
                                                                        .facility
                                                                        .facility_name
                                                                }
                                                            </p>
                                                            <div className="mt-0.5 flex items-center gap-2">
                                                                <span className="text-[10px] text-slate-400">
                                                                    #
                                                                    {booking.id}
                                                                </span>
                                                                <span className="text-[10px] text-slate-300">
                                                                    ·
                                                                </span>
                                                                <span className="text-[10px] text-slate-400 capitalize">
                                                                    {facilityTypeLabel[
                                                                        booking
                                                                            .facility
                                                                            .facility_type
                                                                    ] ??
                                                                        booking
                                                                            .facility
                                                                            .facility_type}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <span className="text-sm text-slate-600">
                                                        {booking.user.name}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <p className="text-sm text-slate-800">
                                                        {new Date(
                                                            booking.booking_date,
                                                        ).toLocaleDateString(
                                                            'en-US',
                                                            {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                year: 'numeric',
                                                            },
                                                        )}
                                                    </p>
                                                    <p className="mt-0.5 text-xs text-slate-400">
                                                        {booking.start_time} –{' '}
                                                        {booking.end_time}
                                                    </p>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <span
                                                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize ${statusBadge[booking.booking_status] ?? 'border-slate-200 bg-slate-50 text-slate-500'}`}
                                                    >
                                                        {booking.booking_status}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4 text-right">
                                                    <Link
                                                        href={`/bookings/${booking.id}`}
                                                        className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-ustp-gold"
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
                                {filtered.map((booking) => (
                                    <Link
                                        key={booking.id}
                                        href={`/bookings/${booking.id}`}
                                        className="block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                                    >
                                        <div className="p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex min-w-0 gap-3">
                                                    <div className="min-w-0">
                                                        <p className="truncate font-medium text-slate-800">
                                                            {
                                                                booking.facility
                                                                    .facility_name
                                                            }
                                                        </p>
                                                        <p className="mt-0.5 text-xs text-slate-400">
                                                            #{booking.id} ·{' '}
                                                            {booking.user.name}
                                                        </p>
                                                    </div>
                                                </div>

                                                <span
                                                    className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${statusBadge[booking.booking_status] ?? 'border-slate-200 bg-slate-50 text-slate-500'}`}
                                                >
                                                    {booking.booking_status}
                                                </span>
                                            </div>

                                            <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                                                <span>
                                                    {new Date(
                                                        booking.booking_date,
                                                    ).toLocaleDateString(
                                                        'en-US',
                                                        {
                                                            month: 'short',
                                                            day: 'numeric',
                                                        },
                                                    )}
                                                </span>
                                                <span className="text-slate-300">
                                                    ·
                                                </span>
                                                <span>
                                                    {booking.start_time} –{' '}
                                                    {booking.end_time}
                                                </span>
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
