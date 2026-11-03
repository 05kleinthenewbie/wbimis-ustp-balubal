import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowUpRight,
    Calendar,
    CheckCircle2,
    Clock3,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

type PendingBooking = {
    id: number;
    booking_date: string;
    start_time: string;
    end_time: string;
    purpose: string | null;
    booking_status: string;
    user: { name: string; email: string };
    facility: { facility_name: string; facility_type: string };
};

type Props = {
    bookings: PendingBooking[];
    stats: {
        pending: number;
        today: number;
        approved: number;
        rejected: number;
    };
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

export default function BookingApprovals({ bookings, stats }: Props) {
    const [processingId, setProcessingId] = useState<number | null>(null);

    const decide = (
        booking: PendingBooking,
        status: 'approved' | 'rejected',
    ) => {
        if (
            status === 'rejected' &&
            !window.confirm(
                `Reject the booking for ${booking.facility.facility_name} requested by ${booking.user.name}?`,
            )
        ) {
            return;
        }

        router.put(
            `/bookings/${booking.id}`,
            { booking_status: status },
            {
                preserveScroll: true,
                onStart: () => setProcessingId(booking.id),
                onFinish: () => setProcessingId(null),
            },
        );
    };

    return (
        <>
            <Head title="Booking Approvals" />

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
                                label: 'Scheduled Today',
                                value: stats.today,
                                icon: Calendar,
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

                    {bookings.length === 0 ? (
                        <div className="relative flex min-h-90 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 text-center">
                            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                                <CheckCircle2 className="size-6" />
                            </div>

                            <h2 className="text-sm font-medium text-slate-800">
                                No pending approvals
                            </h2>

                            <p className="mt-1.5 max-w-sm text-xs leading-5 text-slate-400">
                                All booking requests have been reviewed.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
                                <table className="w-full text-sm">
                                    <thead className="border-b border-slate-200 bg-slate-50">
                                        <tr>
                                            {[
                                                'Facility',
                                                'Requested by',
                                                'Schedule',
                                                'Purpose',
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
                                        {bookings.map((booking) => (
                                            <tr
                                                key={booking.id}
                                                className="border-b border-slate-200 transition-colors last:border-0 hover:bg-slate-50"
                                            >
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ustp-gold/10 text-ustp-gold">
                                                            <Calendar className="size-4" />
                                                        </div>

                                                        <div>
                                                            <p className="font-medium text-slate-800">
                                                                {
                                                                    booking
                                                                        .facility
                                                                        .facility_name
                                                                }
                                                            </p>
                                                            <p className="mt-0.5 text-[10px] text-slate-400">
                                                                #{booking.id} ·{' '}
                                                                {facilityTypeLabel[
                                                                    booking
                                                                        .facility
                                                                        .facility_type
                                                                ] ??
                                                                    booking
                                                                        .facility
                                                                        .facility_type}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <p className="text-sm text-slate-700">
                                                        {booking.user.name}
                                                    </p>
                                                    <p className="mt-0.5 text-xs text-slate-400">
                                                        {booking.user.email}
                                                    </p>
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

                                                <td className="max-w-56 px-5 py-4">
                                                    <p className="line-clamp-2 text-xs text-slate-500">
                                                        {booking.purpose || '—'}
                                                    </p>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            disabled={
                                                                processingId ===
                                                                booking.id
                                                            }
                                                            onClick={() =>
                                                                decide(
                                                                    booking,
                                                                    'approved',
                                                                )
                                                            }
                                                            className="h-8 bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
                                                        >
                                                            <CheckCircle2 className="size-3.5" />
                                                            Approve
                                                        </Button>

                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={
                                                                processingId ===
                                                                booking.id
                                                            }
                                                            onClick={() =>
                                                                decide(
                                                                    booking,
                                                                    'rejected',
                                                                )
                                                            }
                                                            className="h-8 border-rose-200 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                                        >
                                                            <XCircle className="size-3.5" />
                                                            Reject
                                                        </Button>

                                                        <Link
                                                            href={`/bookings/${booking.id}`}
                                                            aria-label={`View booking #${booking.id}`}
                                                            className="inline-flex size-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-ustp-gold"
                                                        >
                                                            <ArrowUpRight className="size-4" />
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="space-y-3 md:hidden">
                                {bookings.map((booking) => (
                                    <div
                                        key={booking.id}
                                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                                    >
                                        <div className="p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="truncate font-medium text-slate-800">
                                                        {
                                                            booking.facility
                                                                .facility_name
                                                        }
                                                    </p>
                                                    <p className="mt-0.5 text-xs text-slate-400">
                                                        {booking.user.name} · #
                                                        {booking.id}
                                                    </p>
                                                </div>

                                                <span
                                                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${statusBadge[booking.booking_status] ?? 'border-slate-200 bg-slate-50 text-slate-500'}`}
                                                >
                                                    {booking.booking_status}
                                                </span>
                                            </div>

                                            <p className="mt-3 text-xs text-slate-500">
                                                {new Date(
                                                    booking.booking_date,
                                                ).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                })}
                                                {' · '}
                                                {booking.start_time} –{' '}
                                                {booking.end_time}
                                            </p>

                                            {booking.purpose && (
                                                <p className="mt-2 line-clamp-2 text-xs text-slate-400">
                                                    {booking.purpose}
                                                </p>
                                            )}

                                            <div className="mt-4 flex gap-2">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    disabled={
                                                        processingId ===
                                                        booking.id
                                                    }
                                                    onClick={() =>
                                                        decide(
                                                            booking,
                                                            'approved',
                                                        )
                                                    }
                                                    className="h-9 flex-1 bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
                                                >
                                                    <CheckCircle2 className="size-3.5" />
                                                    Approve
                                                </Button>

                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={
                                                        processingId ===
                                                        booking.id
                                                    }
                                                    onClick={() =>
                                                        decide(
                                                            booking,
                                                            'rejected',
                                                        )
                                                    }
                                                    className="h-9 flex-1 border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                                >
                                                    <XCircle className="size-3.5" />
                                                    Reject
                                                </Button>
                                            </div>
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
