import { Head, useForm } from '@inertiajs/react';
import { Building2, CalendarDays, MapPin, Plus, Users } from 'lucide-react';
import { BackButton } from '@/components/back-button';
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

const inputClass =
    'h-11 border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus-visible:border-ustp-gold/40 focus-visible:ring-1 focus-visible:ring-ustp-gold/20';

export default function FacilitiesCreate() {
    const { data, setData, post, processing, errors } = useForm({
        facility_name: '',
        facility_type: 'computer_lab',
        capacity: '',
        location: '',
        availability_status: 'available',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post('/facilities');
    }

    return (
        <>
            <Head title="Add Facility" />

            <div className="min-h-full flex-1 bg-slate-50 text-slate-800">
                <div className="relative flex flex-1 flex-col gap-6 overflow-hidden p-4 md:p-6 lg:p-8">
                    <div className="mx-auto w-full max-w-2xl space-y-6">
                        <div className="flex justify-end">
                            <BackButton href="/facilities" />
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex size-9 items-center justify-center rounded-lg bg-ustp-gold/10">
                                            <Building2 className="size-4 text-ustp-gold" />
                                        </div>

                                        <div>
                                            <h2 className="text-sm font-semibold text-slate-800">
                                                Facility details
                                            </h2>
                                            <p className="mt-0.5 text-xs text-slate-400">
                                                Name and type are required.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6 p-6">
                                    {/* Name */}
                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="facility_name"
                                            className="text-xs font-medium text-slate-600"
                                        >
                                            Facility name
                                        </Label>

                                        <Input
                                            id="facility_name"
                                            value={data.facility_name}
                                            onChange={(
                                                e: React.ChangeEvent<HTMLInputElement>,
                                            ) =>
                                                setData(
                                                    'facility_name',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="e.g., Computer Laboratory 1"
                                            className={inputClass}
                                        />

                                        {errors.facility_name && (
                                            <p className="text-xs text-red-600">
                                                {errors.facility_name}
                                            </p>
                                        )}
                                    </div>

                                    {/* Type + Status */}
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label
                                                htmlFor="facility_type"
                                                className="text-xs font-medium text-slate-600"
                                            >
                                                Facility type
                                            </Label>

                                            <Select
                                                value={data.facility_type}
                                                onValueChange={(value) =>
                                                    setData(
                                                        'facility_type',
                                                        value,
                                                    )
                                                }
                                            >
                                                <SelectTrigger
                                                    id="facility_type"
                                                    className="h-11 w-full border-slate-300 bg-white text-slate-800 shadow-none hover:border-ustp-gold/40 focus:ring-1 focus:ring-ustp-gold/20"
                                                >
                                                    <SelectValue />
                                                </SelectTrigger>

                                                <SelectContent className="border-slate-200 bg-white text-slate-800">
                                                    <SelectItem value="computer_lab">
                                                        Computer Lab
                                                    </SelectItem>
                                                    <SelectItem value="av_room">
                                                        AV Room
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>

                                            {errors.facility_type && (
                                                <p className="text-xs text-red-600">
                                                    {errors.facility_type}
                                                </p>
                                            )}
                                        </div>

                                        <div className="grid gap-2">
                                            <Label
                                                htmlFor="availability_status"
                                                className="text-xs font-medium text-slate-600"
                                            >
                                                Availability
                                            </Label>

                                            <Select
                                                value={data.availability_status}
                                                onValueChange={(value) =>
                                                    setData(
                                                        'availability_status',
                                                        value,
                                                    )
                                                }
                                            >
                                                <SelectTrigger
                                                    id="availability_status"
                                                    className="h-11 w-full border-slate-300 bg-white text-slate-800 shadow-none hover:border-ustp-gold/40 focus:ring-1 focus:ring-ustp-gold/20"
                                                >
                                                    <SelectValue />
                                                </SelectTrigger>

                                                <SelectContent className="border-slate-200 bg-white text-slate-800">
                                                    <SelectItem value="available">
                                                        Available
                                                    </SelectItem>
                                                    <SelectItem value="unavailable">
                                                        Unavailable
                                                    </SelectItem>
                                                    <SelectItem value="under_maintenance">
                                                        Under Maintenance
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>

                                            {errors.availability_status && (
                                                <p className="text-xs text-red-600">
                                                    {errors.availability_status}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Capacity + Location */}
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label
                                                htmlFor="capacity"
                                                className="text-xs font-medium text-slate-600"
                                            >
                                                Capacity
                                            </Label>

                                            <div className="relative">
                                                <Users className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />

                                                <Input
                                                    id="capacity"
                                                    type="number"
                                                    min={1}
                                                    value={data.capacity}
                                                    onChange={(
                                                        e: React.ChangeEvent<HTMLInputElement>,
                                                    ) =>
                                                        setData(
                                                            'capacity',
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="e.g., 40"
                                                    className={`${inputClass} pl-10`}
                                                />
                                            </div>

                                            {errors.capacity && (
                                                <p className="text-xs text-red-600">
                                                    {errors.capacity}
                                                </p>
                                            )}
                                        </div>

                                        <div className="grid gap-2">
                                            <Label
                                                htmlFor="location"
                                                className="text-xs font-medium text-slate-600"
                                            >
                                                Location
                                            </Label>

                                            <div className="relative">
                                                <MapPin className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />

                                                <Input
                                                    id="location"
                                                    value={data.location}
                                                    onChange={(
                                                        e: React.ChangeEvent<HTMLInputElement>,
                                                    ) =>
                                                        setData(
                                                            'location',
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="e.g., ICT Building"
                                                    className={`${inputClass} pl-10`}
                                                />
                                            </div>

                                            {errors.location && (
                                                <p className="text-xs text-red-600">
                                                    {errors.location}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Notice */}
                                    <div className="flex gap-3 rounded-xl border border-ustp-gold/20 bg-ustp-gold/4 p-4">
                                        <CalendarDays className="mt-0.5 size-4 shrink-0 text-ustp-gold" />

                                        <div>
                                            <p className="text-xs font-medium text-slate-800">
                                                Bookable immediately
                                            </p>
                                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                                Facilities marked
                                                &quot;Available&quot; appear in
                                                the booking form for faculty and
                                                staff.
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
                                        disabled={processing}
                                        className="bg-ustp-gold px-5 font-semibold text-ustp-navy shadow-lg shadow-ustp-gold/10 transition-all hover:bg-ustp-gold-dark hover:text-white"
                                    >
                                        {processing ? (
                                            <Spinner />
                                        ) : (
                                            <Plus className="size-4" />
                                        )}
                                        Create facility
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
