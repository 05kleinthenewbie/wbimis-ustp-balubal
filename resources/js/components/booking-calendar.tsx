import {
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock3,
    UserRound,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type CalendarBooking = {
    id: number;
    facility_id: number;
    facility_name: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    booking_status: string;
    user_name: string;
};

type CalendarFacility = {
    id: number;
    facility_name: string;
};

type Props = {
    bookings: CalendarBooking[];
    facilities?: CalendarFacility[];
    selectedDate?: string;
    onSelectDate?: (date: string) => void;
    facilityId?: number | string;
    showFacilityFilter?: boolean;
    showRequester?: boolean;
    className?: string;
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];

const statusBadge: Record<string, string> = {
    approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    pending: 'border-amber-200 bg-amber-50 text-amber-700',
    completed: 'border-sky-200 bg-sky-50 text-sky-700',
};

function pad(value: number): string {
    return String(value).padStart(2, '0');
}

function dateKey(year: number, month: number, day: number): string {
    return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function todayKey(): string {
    const today = new Date();

    return dateKey(today.getFullYear(), today.getMonth(), today.getDate());
}

function parseDate(value: string): Date {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);

    return new Date(year, month - 1, day);
}

function formatMonth(date: Date): string {
    return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function formatLongDate(value: string): string {
    return parseDate(value).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
}

function toTime(value: string): string {
    return value.slice(0, 5);
}

export default function BookingCalendar({
    bookings,
    facilities = [],
    selectedDate,
    onSelectDate,
    facilityId,
    showFacilityFilter = false,
    showRequester = false,
    className,
}: Props) {
    const [facilityFilter, setFacilityFilter] = useState('all');
    const [pickedDate, setPickedDate] = useState(selectedDate || todayKey());
    const [monthCursor, setMonthCursor] = useState(() => {
        const initial = parseDate(selectedDate || todayKey());

        return new Date(initial.getFullYear(), initial.getMonth(), 1);
    });

    const activeFacility =
        facilityId !== undefined && facilityId !== ''
            ? String(facilityId)
            : facilityFilter;
    const activeDate = selectedDate || pickedDate;

    const filtered = useMemo(
        () =>
            bookings.filter(
                (booking) =>
                    activeFacility === 'all' ||
                    String(booking.facility_id) === activeFacility,
            ),
        [bookings, activeFacility],
    );

    const bookingsByDate = useMemo(() => {
        const map = new Map<string, CalendarBooking[]>();

        filtered.forEach((booking) => {
            const key = booking.booking_date.slice(0, 10);
            const existing = map.get(key) ?? [];

            existing.push(booking);
            map.set(key, existing);
        });

        return map;
    }, [filtered]);

    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (string | null)[] = Array.from(
        { length: firstWeekday },
        () => null,
    );

    for (let day = 1; day <= daysInMonth; day++) {
        cells.push(dateKey(year, month, day));
    }

    while (cells.length % 7 !== 0) {
        cells.push(null);
    }

    const today = todayKey();
    const dayBookings = bookingsByDate.get(activeDate) ?? [];
    const activeIsSunday = parseDate(activeDate).getDay() === 0;

    function chooseDate(date: string) {
        if (parseDate(date).getDay() === 0) {
            return;
        }

        setPickedDate(date);
        onSelectDate?.(date);
    }

    function shiftMonth(offset: number) {
        setMonthCursor(new Date(year, month + offset, 1));
    }

    function goToToday() {
        const now = new Date();

        setMonthCursor(new Date(now.getFullYear(), now.getMonth(), 1));

        if (now.getDay() !== 0) {
            setPickedDate(today);
            onSelectDate?.(today);
        }
    }

    return (
        <div
            className={cn(
                'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm',
                className,
            )}
        >
            <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-800">
                            Availability calendar
                        </h2>
                        <p className="mt-0.5 text-xs text-slate-400">
                            Pending and approved reservations across facilities.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {showFacilityFilter && facilities.length > 0 && (
                        <Select
                            value={facilityFilter}
                            onValueChange={setFacilityFilter}
                        >
                            <SelectTrigger className="h-9 w-full border-slate-300 bg-white text-xs text-slate-700 sm:w-52">
                                <SelectValue placeholder="All facilities" />
                            </SelectTrigger>

                            <SelectContent className="border-slate-200 bg-white text-slate-800">
                                <SelectItem value="all">
                                    All facilities
                                </SelectItem>

                                {facilities.map((facility) => (
                                    <SelectItem
                                        key={facility.id}
                                        value={String(facility.id)}
                                    >
                                        {facility.facility_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Previous month"
                            onClick={() => shiftMonth(-1)}
                            className="size-7 text-slate-500 hover:text-slate-800"
                        >
                            <ChevronLeft className="size-4" />
                        </Button>

                        <span className="w-32 text-center text-xs font-semibold text-slate-700">
                            {formatMonth(monthCursor)}
                        </span>

                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Next month"
                            onClick={() => shiftMonth(1)}
                            className="size-7 text-slate-500 hover:text-slate-800"
                        >
                            <ChevronRight className="size-4" />
                        </Button>
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={goToToday}
                        className="h-9 border-slate-200 text-xs text-slate-600"
                    >
                        Today
                    </Button>
                </div>
            </div>

            <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_300px]">
                <div>
                    <div className="mb-1 grid grid-cols-7 gap-1 sm:gap-2">
                        {WEEKDAYS.map((weekday) => (
                            <div
                                key={weekday}
                                className="py-1 text-center text-[10px] font-semibold tracking-widest text-slate-400 uppercase"
                            >
                                {weekday.slice(0, 3)}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1 sm:gap-2">
                        {cells.map((cell, index) => {
                            if (!cell) {
                                return (
                                    <div
                                        key={`empty-${index}`}
                                        className="min-h-16 rounded-lg sm:min-h-20"
                                    />
                                );
                            }

                            const day = Number(cell.slice(8, 10));
                            const dayItems = bookingsByDate.get(cell) ?? [];
                            const isSunday = parseDate(cell).getDay() === 0;
                            const isSelected = cell === activeDate && !isSunday;
                            const isToday = cell === today;

                            if (isSunday) {
                                return (
                                    <button
                                        key={cell}
                                        type="button"
                                        disabled
                                        aria-label={`${formatLongDate(cell)} — closed on Sundays`}
                                        className="relative flex min-h-16 cursor-not-allowed flex-col rounded-lg border border-dashed border-slate-200 bg-slate-50 p-1.5 text-left text-slate-300 sm:min-h-20 sm:p-2"
                                    >
                                        <span className="flex size-6 items-center justify-center rounded-full text-xs font-semibold">
                                            {day}
                                        </span>

                                        <span className="mt-auto text-[10px] font-medium">
                                            Closed
                                        </span>
                                    </button>
                                );
                            }

                            return (
                                <button
                                    key={cell}
                                    type="button"
                                    onClick={() => chooseDate(cell)}
                                    aria-pressed={isSelected}
                                    aria-label={`${formatLongDate(cell)}, ${dayItems.length} booking${dayItems.length === 1 ? '' : 's'}`}
                                    className={cn(
                                        'relative flex min-h-16 flex-col rounded-lg border p-1.5 text-left transition-colors sm:min-h-20 sm:p-2',
                                        isSelected
                                            ? 'border-ustp-navy bg-ustp-navy text-white shadow-sm'
                                            : 'border-slate-200 bg-white text-slate-700 hover:border-ustp-gold/50 hover:bg-ustp-gold/5',
                                        isToday &&
                                            !isSelected &&
                                            'border-ustp-gold/60 bg-ustp-gold/5',
                                        dayItems.length > 0 &&
                                            !isSelected &&
                                            'border-emerald-300 bg-emerald-50 hover:border-emerald-400 hover:bg-emerald-100',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'flex size-6 items-center justify-center rounded-full text-xs font-semibold',
                                            isToday &&
                                                !isSelected &&
                                                'bg-ustp-gold text-ustp-navy',
                                        )}
                                    >
                                        {day}
                                    </span>

                                    {dayItems.length > 0 ? (
                                        <span
                                            className={cn(
                                                'mt-auto text-[10px] font-semibold',
                                                isSelected
                                                    ? 'text-white/80'
                                                    : 'text-emerald-700',
                                            )}
                                        >
                                            Booked
                                        </span>
                                    ) : (
                                        <span
                                            className={cn(
                                                'mt-auto text-[10px] font-medium',
                                                isSelected
                                                    ? 'text-white/60'
                                                    : 'text-emerald-600',
                                            )}
                                        >
                                            Free
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
                        <span className="rounded-md border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700">
                            Booked
                        </span>
                        <span className="text-emerald-600">Free</span>
                        <span className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full border border-ustp-gold/60 bg-ustp-gold/10" />
                            Today
                        </span>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="flex items-start gap-2">
                        <CalendarDays className="mt-0.5 size-3.5 shrink-0 text-ustp-gold" />

                        <div>
                            <p className="text-xs font-semibold text-slate-700">
                                {formatLongDate(activeDate)}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                                {activeIsSunday
                                    ? 'Closed on Sundays'
                                    : dayBookings.length === 0
                                      ? 'No reservations'
                                      : `${dayBookings.length} reservation${dayBookings.length === 1 ? '' : 's'}`}
                            </p>
                        </div>
                    </div>

                    {activeIsSunday ? (
                        <p className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-500">
                            Facility bookings are not available on Sundays.
                        </p>
                    ) : dayBookings.length === 0 ? (
                        <p className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-700">
                            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
                            Available all day — no pending or approved bookings
                            on this date.
                        </p>
                    ) : (
                        <div className="mt-4 space-y-2">
                            {dayBookings.map((booking) => (
                                <div
                                    key={booking.id}
                                    className="rounded-lg border border-slate-200 bg-white p-3"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                                            <Clock3 className="size-3 text-slate-400" />
                                            {toTime(booking.start_time)} –{' '}
                                            {toTime(booking.end_time)}
                                        </span>

                                        <span
                                            className={cn(
                                                'rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize',
                                                statusBadge[
                                                    booking.booking_status
                                                ] ??
                                                    'border-slate-200 bg-slate-50 text-slate-500',
                                            )}
                                        >
                                            {booking.booking_status}
                                        </span>
                                    </div>

                                    <p className="mt-1.5 truncate text-xs font-medium text-slate-700">
                                        {booking.facility_name}
                                    </p>

                                    {showRequester && (
                                        <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                                            <UserRound className="size-3" />
                                            {booking.user_name}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export { BookingCalendar };
