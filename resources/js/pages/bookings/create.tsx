import { Head, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    CalendarDays,
    Clock3,
    MapPin,
    Users,
} from 'lucide-react';
import { BackButton } from '@/components/back-button';
import { BookingCalendar } from '@/components/booking-calendar';
import type { CalendarBooking } from '@/components/booking-calendar';
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

type Facility = {
    id: number;
    facility_name: string;
    facility_type: string;
    capacity: number | null;
    location: string | null;
};

type UpcomingBooking = CalendarBooking;

type Props = {
    facilities: Facility[];
    upcomingBookings: UpcomingBooking[];
};

const facilityTypeLabel: Record<string, string> = {
    computer_lab: 'Computer Lab',
    av_room: 'AV Room',
};

function toTime(value: string): string {
    return value.slice(0, 5);
}

function overlaps(
    aStart: string,
    aEnd: string,
    bStart: string,
    bEnd: string,
): boolean {
    return aStart < bEnd && bStart < aEnd;
}

export default function BookingsCreate({
    facilities,
    upcomingBookings,
}: Props) {
    const { data, setData, post, processing, errors } = useForm({
        facility_id: '',
        booking_date: '',
        start_time: '',
        end_time: '',
        purpose: '',
    });

    const selectedFacility = facilities.find(
        (f) => String(f.id) === data.facility_id,
    );

    const dayBookings = upcomingBookings.filter(
        (booking) =>
            String(booking.facility_id) === data.facility_id &&
            booking.booking_date.slice(0, 10) === data.booking_date,
    );

    const hasConflict =
        data.start_time !== '' &&
        data.end_time !== '' &&
        data.start_time < data.end_time &&
        dayBookings.some((booking) =>
            overlaps(
                data.start_time,
                data.end_time,
                toTime(booking.start_time),
                toTime(booking.end_time),
            ),
        );

    const selectedDayIsSunday =
        data.booking_date !== '' &&
        new Date(`${data.booking_date}T00:00:00`).getDay() === 0;

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (selectedDayIsSunday) {
            return;
        }

        post('/bookings');
    }

    return (
        <>
            <Head title="Book a Facility" />

            <div className="min-h-full flex-1 bg-slate-50 text-slate-800">
                <div className="relative flex flex-1 flex-col gap-6 overflow-hidden p-4 md:p-6 lg:p-8">
                    <div className="mx-auto w-full max-w-3xl space-y-6">
                        <div className="flex justify-end">
                            <BackButton href="/bookings" />
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                {/* Form header */}
                                <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <h2 className="text-sm font-semibold text-slate-800">
                                                Booking details
                                            </h2>
                                            <p className="mt-0.5 text-xs text-slate-400">
                                                All fields are required unless
                                                noted.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-7 p-6">
                                    {/* Facility */}
                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="facility_id"
                                            className="text-xs font-medium text-slate-600"
                                        >
                                            Facility
                                        </Label>

                                        <Select
                                            value={data.facility_id}
                                            onValueChange={(value) =>
                                                setData('facility_id', value)
                                            }
                                        >
                                            <SelectTrigger
                                                id="facility_id"
                                                className="h-11 w-full border-slate-300 bg-white text-slate-800 shadow-none hover:border-ustp-gold/40 focus:ring-1 focus:ring-ustp-gold/20"
                                            >
                                                <SelectValue placeholder="Select a facility" />
                                            </SelectTrigger>

                                            <SelectContent className="border-slate-200 bg-white text-slate-800">
                                                {facilities.map((facility) => (
                                                    <SelectItem
                                                        key={facility.id}
                                                        value={String(
                                                            facility.id,
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span>
                                                                {
                                                                    facility.facility_name
                                                                }
                                                            </span>
                                                            <span className="text-[10px] text-slate-400">
                                                                (
                                                                {facilityTypeLabel[
                                                                    facility
                                                                        .facility_type
                                                                ] ??
                                                                    facility.facility_type}
                                                                )
                                                            </span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        {errors.facility_id && (
                                            <p className="text-xs text-red-600">
                                                {errors.facility_id}
                                            </p>
                                        )}
                                    </div>

                                    {/* Facility info card */}
                                    {selectedFacility && (
                                        <div className="rounded-xl border border-ustp-gold/20 bg-ustp-gold/4 p-4">
                                            <div className="flex items-center gap-3">
                                                <div>
                                                    <p className="text-sm font-medium text-slate-800">
                                                        {
                                                            selectedFacility.facility_name
                                                        }
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {facilityTypeLabel[
                                                            selectedFacility
                                                                .facility_type
                                                        ] ??
                                                            selectedFacility.facility_type}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-3 grid grid-cols-2 gap-3">
                                                {selectedFacility.location && (
                                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                                        <MapPin className="size-3.5 text-ustp-gold" />
                                                        {
                                                            selectedFacility.location
                                                        }
                                                    </div>
                                                )}
                                                {selectedFacility.capacity && (
                                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                                        <Users className="size-3.5 text-ustp-gold" />
                                                        Capacity:{' '}
                                                        {
                                                            selectedFacility.capacity
                                                        }
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Date */}
                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="booking_date"
                                            className="text-xs font-medium text-slate-600"
                                        >
                                            Date
                                        </Label>

                                        <div className="relative">
                                            <CalendarDays className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />

                                            <Input
                                                id="booking_date"
                                                type="date"
                                                value={data.booking_date}
                                                onChange={(
                                                    e: React.ChangeEvent<HTMLInputElement>,
                                                ) =>
                                                    setData(
                                                        'booking_date',
                                                        e.target.value,
                                                    )
                                                }
                                                className="h-11 border-slate-300 bg-white pl-10 text-slate-800 scheme-light placeholder:text-slate-400 focus-visible:border-ustp-gold/40 focus-visible:ring-1 focus-visible:ring-ustp-gold/20"
                                            />
                                        </div>

                                        {errors.booking_date && (
                                            <p className="text-xs text-red-600">
                                                {errors.booking_date}
                                            </p>
                                        )}

                                        {selectedDayIsSunday && (
                                            <p className="text-xs text-red-600">
                                                Bookings are not available on
                                                Sundays. Please choose another
                                                date.
                                            </p>
                                        )}
                                    </div>

                                    {/* Time */}
                                    <div>
                                        <div className="mb-3 flex items-center gap-2">
                                            <Clock3 className="size-3.5 text-ustp-gold" />
                                            <span className="text-xs font-medium text-slate-600">
                                                Schedule
                                            </span>
                                        </div>

                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="grid gap-2">
                                                <Label
                                                    htmlFor="start_time"
                                                    className="text-xs text-slate-400"
                                                >
                                                    Start time
                                                </Label>

                                                <Input
                                                    id="start_time"
                                                    type="time"
                                                    value={data.start_time}
                                                    onChange={(
                                                        e: React.ChangeEvent<HTMLInputElement>,
                                                    ) =>
                                                        setData(
                                                            'start_time',
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="h-11 border-slate-300 bg-white text-slate-800 scheme-light placeholder:text-slate-400 focus-visible:border-ustp-gold/40 focus-visible:ring-1 focus-visible:ring-ustp-gold/20"
                                                />
                                            </div>

                                            <div className="grid gap-2">
                                                <Label
                                                    htmlFor="end_time"
                                                    className="text-xs text-slate-400"
                                                >
                                                    End time
                                                </Label>

                                                <Input
                                                    id="end_time"
                                                    type="time"
                                                    value={data.end_time}
                                                    onChange={(
                                                        e: React.ChangeEvent<HTMLInputElement>,
                                                    ) =>
                                                        setData(
                                                            'end_time',
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="h-11 border-slate-300 bg-white text-slate-800 scheme-light placeholder:text-slate-400 focus-visible:border-ustp-gold/40 focus-visible:ring-1 focus-visible:ring-ustp-gold/20"
                                                />
                                            </div>
                                        </div>

                                        {errors.start_time && (
                                            <p className="mt-2 text-xs text-red-600">
                                                {errors.start_time}
                                            </p>
                                        )}
                                    </div>

                                    {/* Availability calendar */}
                                    <div>
                                        <div className="mb-3 flex items-center gap-2">
                                            <CalendarDays className="size-3.5 text-ustp-gold" />
                                            <span className="text-xs font-medium text-slate-600">
                                                Check availability
                                            </span>
                                        </div>

                                        <BookingCalendar
                                            key={
                                                data.booking_date || 'calendar'
                                            }
                                            bookings={upcomingBookings}
                                            selectedDate={data.booking_date}
                                            onSelectDate={(date) =>
                                                setData('booking_date', date)
                                            }
                                            facilityId={data.facility_id}
                                            showRequester
                                        />

                                        {hasConflict && (
                                            <div className="mt-3 flex gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
                                                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-rose-600" />
                                                <p className="text-xs leading-5 text-rose-600">
                                                    The schedule you selected
                                                    overlaps with an existing
                                                    booking. Please pick a
                                                    different time slot.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Purpose */}
                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="purpose"
                                            className="text-xs font-medium text-slate-600"
                                        >
                                            Purpose
                                        </Label>

                                        <Textarea
                                            id="purpose"
                                            rows={4}
                                            placeholder="Describe why you need this facility (e.g., class, meeting, event)..."
                                            value={data.purpose}
                                            onChange={(
                                                e: React.ChangeEvent<HTMLTextAreaElement>,
                                            ) =>
                                                setData(
                                                    'purpose',
                                                    e.target.value,
                                                )
                                            }
                                            className="resize-none border-slate-300 bg-white text-slate-800 shadow-none placeholder:text-slate-400 focus-visible:border-ustp-gold/40 focus-visible:ring-1 focus-visible:ring-ustp-gold/20"
                                        />
                                    </div>

                                    {/* Notice */}
                                    <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                                        <Clock3 className="mt-0.5 size-4 shrink-0 text-amber-600" />

                                        <div>
                                            <p className="text-xs font-medium text-slate-800">
                                                Approval required
                                            </p>
                                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                                Your booking will remain pending
                                                until it is reviewed by an ICT
                                                administrator.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:justify-end">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => window.history.back()}
                                        className="text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                    >
                                        Cancel
                                    </Button>

                                    <Button
                                        type="submit"
                                        disabled={
                                            processing || selectedDayIsSunday
                                        }
                                        className="bg-ustp-gold px-5 font-semibold text-ustp-navy shadow-lg shadow-ustp-gold/10 transition-all hover:bg-ustp-gold-dark hover:text-white"
                                    >
                                        {processing && <Spinner />}
                                        Request booking
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}
