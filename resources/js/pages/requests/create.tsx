import { Head, useForm } from '@inertiajs/react';
import { AlertCircle, Check, Send, Paperclip, X } from 'lucide-react';
import { useState } from 'react';
import { BackButton } from '@/components/back-button';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { store } from '@/routes/requests';

type ServiceTypeItem = {
    id: number;
    service_name: string;
    default_action: string | null;
};

type ServiceCategoryItem = {
    id: number;
    category_name: string;
    service_types: ServiceTypeItem[];
};

type Props = {
    categories: ServiceCategoryItem[];
    isStudent: boolean;
};

type ServiceLine = {
    service_type_id: number;
    specification: string;
    quantity: number;
    action_type: string;
};

const actionOptionsByCategory: Record<string, string[]> = {
    'Network Services': ['New Connection', 'Troubleshoot'],
    'Hardware Services': ['Installation', 'Troubleshoot', 'Update'],
    'Software Services': ['Installation', 'Troubleshoot', 'Update'],
    'Information System Services': ['Create New', 'Troubleshoot', 'Update'],
};

const fieldClass =
    'h-9 border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus-visible:border-ustp-gold/40 focus-visible:ring-1 focus-visible:ring-ustp-gold/20';

export default function RequestsCreate({ categories, isStudent }: Props) {
    const [selected, setSelected] = useState<Record<number, ServiceLine>>({});

    const { data, setData, post, transform, processing, errors } = useForm({
        problem_description: '',
        location: '',
        contact_details: '',
        services: [] as ServiceLine[],
        attachments: [] as File[],
    });

    function toggleService(typeId: number, defaultAction: string | null) {
        setSelected((prev) => {
            const next = { ...prev };

            if (next[typeId]) {
                delete next[typeId];
            } else {
                next[typeId] = {
                    service_type_id: typeId,
                    specification: '',
                    quantity: 1,
                    action_type: defaultAction ?? '',
                };
            }

            return next;
        });
    }

    function updateLine(
        typeId: number,
        field: keyof ServiceLine,
        value: string | number,
    ) {
        setSelected((prev) => ({
            ...prev,
            [typeId]: {
                ...prev[typeId],
                [field]: value,
            },
        }));
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        transform((values) => ({
            ...values,
            services: Object.values(selected),
        }));
        post(store().url, {
            onSuccess: () => setSelected({}),
        });
    }

    const hasSelection = Object.keys(selected).length > 0;
    const selectionCount = Object.keys(selected).length;

    return (
        <>
            <Head title="New Service Request" />

            <div className="relative min-h-full flex-1 overflow-hidden bg-slate-50 px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
                <div className="relative mx-auto max-w-4xl space-y-6">
                    <div className="flex justify-end">
                        <BackButton href="/requests" />
                    </div>

                    <form
                        onSubmit={handleSubmit}
                        className="flex flex-col gap-6"
                    >
                        {/* Services card */}
                        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
                                <div className="flex items-center gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">
                                            Select services
                                        </p>
                                        <p className="mt-0.5 text-[11px] text-slate-400">
                                            Check a service to provide its
                                            specification, quantity, and action.
                                        </p>
                                    </div>
                                </div>

                                {selectionCount > 0 && (
                                    <span className="w-fit rounded-lg bg-ustp-gold/10 px-2.5 py-1 text-[10px] font-semibold text-ustp-gold">
                                        {selectionCount} selected
                                    </span>
                                )}
                            </div>

                            <div className="p-4 md:p-6">
                                <div className="flex flex-col gap-7">
                                    {categories.map((category) => {
                                        const actionOptions =
                                            actionOptionsByCategory[
                                                category.category_name
                                            ] ?? [];

                                        return (
                                            <div key={category.id}>
                                                {/* Category heading */}
                                                <div className="mb-3 flex items-center gap-3">
                                                    <span className="text-[10px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
                                                        {category.category_name}
                                                    </span>
                                                    <div className="h-px flex-1 bg-slate-200" />
                                                </div>

                                                {/* Services */}
                                                <div className="flex flex-col gap-2">
                                                    {category.service_types.map(
                                                        (type) => {
                                                            const isChecked =
                                                                Boolean(
                                                                    selected[
                                                                        type.id
                                                                    ],
                                                                );

                                                            return (
                                                                <div
                                                                    key={
                                                                        type.id
                                                                    }
                                                                    className={`rounded-xl border p-3 transition-all ${
                                                                        isChecked
                                                                            ? 'border-ustp-gold/40 bg-ustp-gold/6 shadow-[0_0_20px_rgba(242,169,0,0.06)]'
                                                                            : 'border-slate-200 bg-white hover:border-ustp-gold/30'
                                                                    }`}
                                                                >
                                                                    <div className="flex flex-col gap-3">
                                                                        {/* Service selector */}
                                                                        <div className="flex items-center gap-3">
                                                                            <Checkbox
                                                                                checked={
                                                                                    isChecked
                                                                                }
                                                                                onCheckedChange={() =>
                                                                                    toggleService(
                                                                                        type.id,
                                                                                        type.default_action,
                                                                                    )
                                                                                }
                                                                                className="border-slate-300 data-[state=checked]:border-ustp-gold data-[state=checked]:bg-ustp-gold data-[state=checked]:text-ustp-navy"
                                                                            />

                                                                            <div className="min-w-0 flex-1">
                                                                                <p
                                                                                    className={`text-sm font-medium ${isChecked ? 'text-slate-800' : 'text-slate-600'}`}
                                                                                >
                                                                                    {
                                                                                        type.service_name
                                                                                    }
                                                                                </p>
                                                                                {isChecked && (
                                                                                    <p className="mt-0.5 text-[10px] text-ustp-gold">
                                                                                        Service
                                                                                        selected
                                                                                    </p>
                                                                                )}
                                                                            </div>

                                                                            {isChecked && (
                                                                                <div className="flex size-6 items-center justify-center rounded-full bg-ustp-gold/10 text-ustp-gold">
                                                                                    <Check className="size-3.5" />
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Selected fields */}
                                                                        {isChecked && (
                                                                            <div className="grid gap-3 border-t border-slate-200 pt-3 md:grid-cols-[1fr_100px_180px]">
                                                                                <div className="grid gap-1.5">
                                                                                    <Label
                                                                                        htmlFor={`specification-${type.id}`}
                                                                                        className="text-[10px] font-medium tracking-wider text-slate-500 uppercase"
                                                                                    >
                                                                                        Specification
                                                                                    </Label>
                                                                                    <Input
                                                                                        id={`specification-${type.id}`}
                                                                                        value={
                                                                                            selected[
                                                                                                type
                                                                                                    .id
                                                                                            ]
                                                                                                ?.specification ??
                                                                                            ''
                                                                                        }
                                                                                        onChange={(
                                                                                            e,
                                                                                        ) =>
                                                                                            updateLine(
                                                                                                type.id,
                                                                                                'specification',
                                                                                                e
                                                                                                    .target
                                                                                                    .value,
                                                                                            )
                                                                                        }
                                                                                        className={
                                                                                            fieldClass
                                                                                        }
                                                                                    />
                                                                                </div>

                                                                                <div className="grid gap-1.5">
                                                                                    <Label
                                                                                        htmlFor={`quantity-${type.id}`}
                                                                                        className="text-[10px] font-medium tracking-wider text-slate-500 uppercase"
                                                                                    >
                                                                                        Quantity
                                                                                    </Label>
                                                                                    <Input
                                                                                        id={`quantity-${type.id}`}
                                                                                        type="number"
                                                                                        min={
                                                                                            1
                                                                                        }
                                                                                        value={
                                                                                            selected[
                                                                                                type
                                                                                                    .id
                                                                                            ]
                                                                                                ?.quantity ??
                                                                                            1
                                                                                        }
                                                                                        onChange={(
                                                                                            e,
                                                                                        ) =>
                                                                                            updateLine(
                                                                                                type.id,
                                                                                                'quantity',
                                                                                                Number(
                                                                                                    e
                                                                                                        .target
                                                                                                        .value,
                                                                                                ) ||
                                                                                                    1,
                                                                                            )
                                                                                        }
                                                                                        className={
                                                                                            fieldClass
                                                                                        }
                                                                                    />
                                                                                </div>

                                                                                <div className="grid gap-1.5">
                                                                                    <Label
                                                                                        htmlFor={`action-${type.id}`}
                                                                                        className="text-[10px] font-medium tracking-wider text-slate-500 uppercase"
                                                                                    >
                                                                                        Action
                                                                                    </Label>
                                                                                    <Select
                                                                                        disabled={
                                                                                            !isChecked
                                                                                        }
                                                                                        value={
                                                                                            selected[
                                                                                                type
                                                                                                    .id
                                                                                            ]
                                                                                                ?.action_type ??
                                                                                            ''
                                                                                        }
                                                                                        onValueChange={(
                                                                                            value,
                                                                                        ) =>
                                                                                            updateLine(
                                                                                                type.id,
                                                                                                'action_type',
                                                                                                value,
                                                                                            )
                                                                                        }
                                                                                    >
                                                                                        <SelectTrigger
                                                                                            id={`action-${type.id}`}
                                                                                            className="h-9 w-full border-slate-300 bg-white text-xs text-slate-800 focus:ring-1 focus:ring-ustp-gold/20"
                                                                                        >
                                                                                            <SelectValue placeholder="Select action" />
                                                                                        </SelectTrigger>
                                                                                        <SelectContent className="border-slate-200 bg-white text-slate-800">
                                                                                            {actionOptions.map(
                                                                                                (
                                                                                                    action,
                                                                                                ) => (
                                                                                                    <SelectItem
                                                                                                        key={
                                                                                                            action
                                                                                                        }
                                                                                                        value={
                                                                                                            action
                                                                                                        }
                                                                                                    >
                                                                                                        {
                                                                                                            action
                                                                                                        }
                                                                                                    </SelectItem>
                                                                                                ),
                                                                                            )}
                                                                                        </SelectContent>
                                                                                    </Select>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        },
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {errors.services && (
                                    <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                                        <AlertCircle className="size-4" />
                                        {errors.services}
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Problem description */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                            <div className="mb-4 flex items-center gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">
                                        {isStudent
                                            ? 'Purpose'
                                            : 'Problem description'}
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-slate-400">
                                        {isStudent
                                            ? 'State the purpose of your request.'
                                            : 'Explain the issue or provide details that may help the ICT team.'}
                                    </p>
                                </div>
                            </div>

                            <Textarea
                                id="problem_description"
                                rows={5}
                                placeholder={
                                    isStudent
                                        ? 'Describe the purpose of your request...'
                                        : 'Describe the problem, affected equipment, or any relevant details...'
                                }
                                value={data.problem_description}
                                onChange={(e) =>
                                    setData(
                                        'problem_description',
                                        e.target.value,
                                    )
                                }
                                className={`resize-none border-slate-300 bg-white text-sm leading-6 text-slate-800 placeholder:text-slate-400 focus-visible:border-ustp-gold/40 focus-visible:ring-1 focus-visible:ring-ustp-gold/20 ${errors.problem_description ? 'border-red-400/40' : ''}`}
                            />

                            {errors.problem_description && (
                                <p className="mt-2 text-xs text-red-600">
                                    {errors.problem_description}
                                </p>
                            )}

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <div className="grid gap-1.5">
                                    <Label
                                        htmlFor="location"
                                        className="text-[10px] font-medium tracking-wider text-slate-500 uppercase"
                                    >
                                        Location (Optional)
                                    </Label>
                                    <Input
                                        id="location"
                                        placeholder="e.g. Room 204, Building A, 2nd Floor"
                                        value={data.location}
                                        onChange={(e) =>
                                            setData('location', e.target.value)
                                        }
                                        className={fieldClass}
                                    />
                                    {errors.location && (
                                        <p className="text-xs text-red-600">
                                            {errors.location}
                                        </p>
                                    )}
                                </div>

                                <div className="grid gap-1.5">
                                    <Label
                                        htmlFor="contact_details"
                                        className="text-[10px] font-medium tracking-wider text-slate-500 uppercase"
                                    >
                                        Contact Details (Optional)
                                    </Label>
                                    <Input
                                        id="contact_details"
                                        placeholder="e.g. Local 123, 09123456789"
                                        value={data.contact_details}
                                        onChange={(e) =>
                                            setData(
                                                'contact_details',
                                                e.target.value,
                                            )
                                        }
                                        className={fieldClass}
                                    />
                                    {errors.contact_details && (
                                        <p className="text-xs text-red-600">
                                            {errors.contact_details}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </section>

                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                            <div className="mb-4 flex items-center gap-3">
                                <Paperclip className="size-5 text-ustp-gold" />
                                <div>
                                    <Label
                                        htmlFor="attachments"
                                        className="font-semibold text-slate-800"
                                    >
                                        Attachments (optional)
                                    </Label>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Upload up to 5 files, 5 MB each. PDF,
                                        JPG, PNG, Word, and Excel files are
                                        supported.
                                    </p>
                                </div>
                            </div>
                            <Input
                                id="attachments"
                                type="file"
                                multiple
                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                                onChange={(event) => {
                                    const files = Array.from(
                                        event.target.files ?? [],
                                    );
                                    setData('attachments', [
                                        ...data.attachments,
                                        ...files,
                                    ]);
                                    event.target.value = '';
                                }}
                            />
                            {errors.attachments && (
                                <p className="mt-2 text-sm text-red-600">
                                    {errors.attachments}
                                </p>
                            )}
                            <ul className="mt-3 space-y-2">
                                {data.attachments.map((file, index) => (
                                    <li
                                        key={`${file.name}-${index}`}
                                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate">
                                                {file.name}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {(
                                                    file.size /
                                                    1024 /
                                                    1024
                                                ).toFixed(2)}{' '}
                                                MB
                                            </p>
                                            {(errors as Record<string, string>)[
                                                `attachments.${index}`
                                            ] && (
                                                <p className="text-xs text-red-600">
                                                    {
                                                        (
                                                            errors as Record<
                                                                string,
                                                                string
                                                            >
                                                        )[
                                                            `attachments.${index}`
                                                        ]
                                                    }
                                                </p>
                                            )}
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            aria-label={`Remove ${file.name}`}
                                            onClick={() =>
                                                setData(
                                                    'attachments',
                                                    data.attachments.filter(
                                                        (_, fileIndex) =>
                                                            fileIndex !== index,
                                                    ),
                                                )
                                            }
                                        >
                                            <X className="size-4" />
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        </section>

                        {/* Submit */}
                        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between md:p-5">
                            <div>
                                <p className="text-xs font-medium text-slate-800">
                                    Ready to submit?
                                </p>
                                <p className="mt-1 text-[11px] text-slate-400">
                                    Select at least one service before
                                    submitting.
                                </p>
                            </div>

                            <Button
                                type="submit"
                                disabled={processing || !hasSelection}
                                className="h-10 bg-ustp-gold px-5 text-sm font-semibold text-ustp-navy shadow-lg shadow-ustp-gold/10 transition-all hover:bg-ustp-gold-dark hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {processing ? (
                                    <Spinner />
                                ) : (
                                    <Send className="size-4" />
                                )}
                                Submit Request
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
