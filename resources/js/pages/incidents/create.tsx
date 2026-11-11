import { Head, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    CalendarDays,
    Check,
    Circle,
    FileQuestion,
    Monitor,
    Package,
    Search,
    Send,
    ShieldAlert,
    UserMinus,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BackButton } from '@/components/back-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';

type InventoryItemOption = {
    id: number;
    item_name: string;
    property_no: string;
};

type Props = {
    inventoryItems: InventoryItemOption[];
};

const fieldClass =
    'border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus-visible:border-ustp-gold/40 focus-visible:ring-1 focus-visible:ring-ustp-gold/20';

function equipmentLabel(item: InventoryItemOption): string {
    return `${item.item_name} (${item.property_no})`;
}

function highlightMatch(value: string, query: string) {
    const trimmed = query.trim();
    const index = trimmed
        ? value.toLowerCase().indexOf(trimmed.toLowerCase())
        : -1;

    if (index < 0) {
        return value;
    }

    return (
        <>
            {value.slice(0, index)}
            <mark className="bg-transparent font-semibold text-ustp-navy">
                {value.slice(index, index + trimmed.length)}
            </mark>
            {value.slice(index + trimmed.length)}
        </>
    );
}

const incidentTypes = [
    {
        value: 'Equipment damage',
        icon: Monitor,
        hint: 'Broken or damaged ICT equipment',
    },
    {
        value: 'Unauthorized use',
        icon: UserMinus,
        hint: 'Used without permission',
    },
    {
        value: 'Theft or loss',
        icon: Package,
        hint: 'Missing or lost equipment',
    },
    {
        value: 'Safety concern',
        icon: ShieldAlert,
        hint: 'Hazards around ICT gear',
    },
    {
        value: 'Others',
        icon: FileQuestion,
        hint: 'Anything not listed above',
    },
];

export default function IncidentsCreate({ inventoryItems }: Props) {
    const { data, setData, post, processing, errors, transform } = useForm({
        incident_type: '',
        incident_type_other: '',
        item_id: '',
        incident_description: '',
        incident_date: '',
        attachments: [] as File[],
    });

    const [equipmentQuery, setEquipmentQuery] = useState('');
    const [equipmentOpen, setEquipmentOpen] = useState(false);
    const [activeEquipment, setActiveEquipment] = useState(0);
    const equipmentRef = useRef<HTMLDivElement>(null);

    const selectedEquipment =
        inventoryItems.find((item) => String(item.id) === data.item_id) ?? null;

    const equipmentMatches = useMemo(() => {
        const query = equipmentQuery.trim().toLowerCase();
        const list = query
            ? inventoryItems.filter(
                  (item) =>
                      item.item_name.toLowerCase().includes(query) ||
                      item.property_no.toLowerCase().includes(query),
              )
            : inventoryItems;

        return list.slice(0, 8);
    }, [equipmentQuery, inventoryItems]);

    const showEquipmentSuggestions =
        equipmentOpen && equipmentMatches.length > 0;

    useEffect(() => {
        function handleOutsideClick(event: MouseEvent) {
            if (!equipmentRef.current?.contains(event.target as Node)) {
                setEquipmentOpen(false);
            }
        }

        document.addEventListener('mousedown', handleOutsideClick);

        return () =>
            document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    const isOthers = data.incident_type === 'Others';
    const descriptionLength = data.incident_description.trim().length;
    const otherLength = data.incident_type_other.trim().length;
    const typeDone =
        data.incident_type !== '' && (!isOthers || otherLength > 0);
    const canSubmit = typeDone && descriptionLength > 0;

    const checklist = [
        { label: 'Incident type selected', done: typeDone },
        {
            label: 'Description provided',
            done: descriptionLength > 0,
        },
    ];

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        transform((formData) => ({
            ...formData,
            incident_type:
                formData.incident_type === 'Others'
                    ? formData.incident_type_other.trim()
                    : formData.incident_type,
        }));
        post('/incidents');
    }

    function chooseEquipment(item: InventoryItemOption) {
        setData('item_id', String(item.id));
        setEquipmentQuery(equipmentLabel(item));
        setEquipmentOpen(false);
        setActiveEquipment(0);
    }

    function clearEquipment() {
        setData('item_id', '');
        setEquipmentQuery('');
        setEquipmentOpen(false);
        setActiveEquipment(0);
    }

    function handleEquipmentChange(value: string) {
        setEquipmentQuery(value);
        setEquipmentOpen(true);
        setActiveEquipment(0);

        if (selectedEquipment && equipmentLabel(selectedEquipment) !== value) {
            setData('item_id', '');
        }
    }

    function handleEquipmentKeyDown(
        event: React.KeyboardEvent<HTMLInputElement>,
    ) {
        if (event.key === 'Escape') {
            setEquipmentOpen(false);

            return;
        }

        if (!showEquipmentSuggestions) {
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveEquipment(
                (index) => (index + 1) % equipmentMatches.length,
            );

            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveEquipment(
                (index) =>
                    (index - 1 + equipmentMatches.length) %
                    equipmentMatches.length,
            );

            return;
        }

        if (event.key === 'Enter' && equipmentQuery.trim()) {
            event.preventDefault();
            const picked = equipmentMatches[activeEquipment];

            if (picked) {
                chooseEquipment(picked);
            }
        }
    }

    return (
        <>
            <Head title="Report Laboratory Incident" />

            <div className="relative min-h-full flex-1 overflow-hidden bg-slate-50 px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
                <div className="relative mx-auto max-w-3xl space-y-6">
                    <div className="flex justify-end">
                        <BackButton href="/incidents" />
                    </div>

                    <form
                        onSubmit={handleSubmit}
                        className="flex flex-col gap-6"
                    >
                        {/* Incident type tiles */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                            <div className="mb-4 flex items-center gap-3">
                                <div className="flex size-9 items-center justify-center rounded-lg bg-ustp-gold/10">
                                    <ShieldAlert className="size-4 text-ustp-gold" />
                                </div>

                                <div>
                                    <p className="text-sm font-semibold text-slate-800">
                                        Incident type{' '}
                                        <span className="text-red-500">*</span>
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-slate-400">
                                        Choose what best describes the incident.
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                {incidentTypes.map((type) => {
                                    const selected =
                                        data.incident_type === type.value;
                                    const Icon = type.icon;

                                    return (
                                        <button
                                            key={type.value}
                                            type="button"
                                            aria-pressed={selected}
                                            onClick={() =>
                                                setData(
                                                    'incident_type',
                                                    type.value,
                                                )
                                            }
                                            className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                                                selected
                                                    ? 'border-ustp-gold/50 bg-ustp-gold/6 shadow-sm ring-1 ring-ustp-gold/30'
                                                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                        >
                                            <div
                                                className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                                                    selected
                                                        ? 'bg-ustp-gold/15 text-ustp-gold'
                                                        : 'bg-slate-100 text-slate-400'
                                                }`}
                                            >
                                                <Icon className="size-4" />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <p
                                                    className={`text-sm font-medium ${selected ? 'text-slate-800' : 'text-slate-600'}`}
                                                >
                                                    {type.value}
                                                </p>
                                                <p className="mt-0.5 text-[11px] text-slate-400">
                                                    {type.hint}
                                                </p>
                                            </div>

                                            <div
                                                className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full transition-colors ${
                                                    selected
                                                        ? 'bg-ustp-gold text-white'
                                                        : 'border border-slate-300 text-transparent'
                                                }`}
                                            >
                                                {selected ? (
                                                    <Check className="size-3" />
                                                ) : (
                                                    <Circle className="size-3" />
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {isOthers && (
                                <div className="mt-3 grid gap-2">
                                    <label
                                        htmlFor="incident_type_other"
                                        className="text-xs font-medium text-slate-600"
                                    >
                                        Specify incident type{' '}
                                        <span className="text-red-500">*</span>
                                    </label>

                                    <Input
                                        id="incident_type_other"
                                        type="text"
                                        maxLength={100}
                                        placeholder="e.g., Water spill, Power outage"
                                        value={data.incident_type_other}
                                        onChange={(
                                            e: React.ChangeEvent<HTMLInputElement>,
                                        ) =>
                                            setData(
                                                'incident_type_other',
                                                e.target.value,
                                            )
                                        }
                                        className={`h-10 text-sm ${fieldClass}`}
                                    />

                                    <p className="text-[11px] text-slate-400">
                                        This will be saved as the incident type
                                        of your report.
                                    </p>
                                </div>
                            )}

                            {errors.incident_type && (
                                <p className="mt-3 text-xs text-red-600">
                                    {errors.incident_type}
                                </p>
                            )}
                        </section>

                        {/* Date + equipment */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                            <div className="mb-4 flex items-center gap-3">
                                <div className="flex size-9 items-center justify-center rounded-lg bg-ustp-gold/10">
                                    <CalendarDays className="size-4 text-ustp-gold" />
                                </div>

                                <div>
                                    <p className="text-sm font-semibold text-slate-800">
                                        When &amp; what equipment
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-slate-400">
                                        Optional details that help ICT locate
                                        the issue.
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <label
                                        htmlFor="incident_date"
                                        className="text-xs font-medium text-slate-600"
                                    >
                                        Date of incident{' '}
                                        <span className="font-normal text-slate-400">
                                            (optional)
                                        </span>
                                    </label>

                                    <div className="relative">
                                        <CalendarDays className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                        <Input
                                            id="incident_date"
                                            type="date"
                                            value={data.incident_date}
                                            onChange={(
                                                e: React.ChangeEvent<HTMLInputElement>,
                                            ) =>
                                                setData(
                                                    'incident_date',
                                                    e.target.value,
                                                )
                                            }
                                            className={`h-10 pl-10 text-sm scheme-light ${fieldClass} ${errors.incident_date ? 'border-red-300 focus-visible:border-red-400 focus-visible:ring-red-200' : ''}`}
                                        />
                                    </div>

                                    {errors.incident_date && (
                                        <p className="text-xs text-red-600">
                                            {errors.incident_date}
                                        </p>
                                    )}
                                </div>

                                <div className="grid gap-2">
                                    <label
                                        htmlFor="item_id"
                                        className="text-xs font-medium text-slate-600"
                                    >
                                        Related equipment{' '}
                                        <span className="font-normal text-slate-400">
                                            (optional)
                                        </span>
                                    </label>

                                    <div
                                        ref={equipmentRef}
                                        className="relative"
                                    >
                                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />

                                        <Input
                                            id="item_id"
                                            type="text"
                                            role="combobox"
                                            aria-expanded={
                                                showEquipmentSuggestions
                                            }
                                            aria-controls="equipment-suggestions"
                                            aria-autocomplete="list"
                                            aria-activedescendant={
                                                showEquipmentSuggestions
                                                    ? `equipment-suggestion-${activeEquipment}`
                                                    : undefined
                                            }
                                            autoComplete="off"
                                            placeholder="Type to search by name or property no..."
                                            value={equipmentQuery}
                                            onChange={(e) =>
                                                handleEquipmentChange(
                                                    e.target.value,
                                                )
                                            }
                                            onFocus={() =>
                                                setEquipmentOpen(true)
                                            }
                                            onKeyDown={handleEquipmentKeyDown}
                                            className={`h-10 w-full pr-9 pl-9 text-sm ${fieldClass} ${errors.item_id ? 'border-red-300 focus-visible:border-red-400 focus-visible:ring-red-200' : ''}`}
                                        />

                                        {equipmentQuery && (
                                            <button
                                                type="button"
                                                onClick={clearEquipment}
                                                aria-label="Clear equipment"
                                                className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                                            >
                                                <X className="size-3.5" />
                                            </button>
                                        )}

                                        {showEquipmentSuggestions && (
                                            <ul
                                                id="equipment-suggestions"
                                                role="listbox"
                                                className="absolute top-full right-0 left-0 z-20 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg shadow-slate-200/70"
                                            >
                                                {!equipmentQuery.trim() && (
                                                    <li
                                                        role="option"
                                                        aria-selected={false}
                                                    >
                                                        <button
                                                            type="button"
                                                            onMouseDown={(
                                                                event,
                                                            ) =>
                                                                event.preventDefault()
                                                            }
                                                            onClick={
                                                                clearEquipment
                                                            }
                                                            className="flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2 text-left text-xs text-slate-500 hover:bg-slate-50"
                                                        >
                                                            <X className="size-3.5 shrink-0 text-slate-400" />
                                                            None — no linked
                                                            equipment
                                                        </button>
                                                    </li>
                                                )}

                                                {equipmentMatches.map(
                                                    (item, index) => (
                                                        <li
                                                            key={item.id}
                                                            id={`equipment-suggestion-${index}`}
                                                            role="option"
                                                            aria-selected={
                                                                index ===
                                                                activeEquipment
                                                            }
                                                        >
                                                            <button
                                                                type="button"
                                                                onMouseDown={(
                                                                    event,
                                                                ) =>
                                                                    event.preventDefault()
                                                                }
                                                                onMouseEnter={() =>
                                                                    setActiveEquipment(
                                                                        index,
                                                                    )
                                                                }
                                                                onClick={() =>
                                                                    chooseEquipment(
                                                                        item,
                                                                    )
                                                                }
                                                                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs ${
                                                                    index ===
                                                                    activeEquipment
                                                                        ? 'bg-slate-100'
                                                                        : 'bg-white'
                                                                }`}
                                                            >
                                                                <Package className="size-3.5 shrink-0 text-slate-400" />

                                                                <span className="min-w-0 flex-1 truncate text-slate-700">
                                                                    {highlightMatch(
                                                                        item.item_name,
                                                                        equipmentQuery,
                                                                    )}
                                                                </span>

                                                                <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                                                                    {
                                                                        item.property_no
                                                                    }
                                                                </span>
                                                            </button>
                                                        </li>
                                                    ),
                                                )}
                                            </ul>
                                        )}
                                    </div>

                                    {errors.item_id && (
                                        <p className="text-xs text-red-600">
                                            {errors.item_id}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* Description */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                            <div className="mb-4 flex items-center gap-3">
                                <div className="flex size-9 items-center justify-center rounded-lg bg-ustp-gold/10">
                                    <AlertTriangle className="size-4 text-ustp-gold" />
                                </div>

                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-slate-800">
                                        Description{' '}
                                        <span className="text-red-500">*</span>
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-slate-400">
                                        Explain what happened, when, and who was
                                        involved.
                                    </p>
                                </div>

                                <span className="text-[11px] text-slate-400 tabular-nums">
                                    {descriptionLength} chars
                                </span>
                            </div>

                            <Textarea
                                id="incident_description"
                                rows={5}
                                placeholder="Describe the incident, location, affected equipment, or any relevant details..."
                                value={data.incident_description}
                                onChange={(
                                    e: React.ChangeEvent<HTMLTextAreaElement>,
                                ) =>
                                    setData(
                                        'incident_description',
                                        e.target.value,
                                    )
                                }
                                className={`resize-none text-sm leading-6 ${fieldClass} ${errors.incident_description ? 'border-red-300 focus-visible:border-red-400 focus-visible:ring-red-200' : ''}`}
                            />

                            {errors.incident_description && (
                                <p className="mt-2 text-xs text-red-600">
                                    {errors.incident_description}
                                </p>
                            )}
                        </section>

                        {/* Evidence */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                            <div className="mb-4 flex items-center gap-3">
                                <div className="flex size-9 items-center justify-center rounded-lg bg-ustp-gold/10">
                                    <FileQuestion className="size-4 text-ustp-gold" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">
                                        Evidence{' '}
                                        <span className="font-normal text-slate-400">
                                            (optional)
                                        </span>
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-slate-400">
                                        Photos or documents, up to 5 files (max
                                        5 MB each)
                                    </p>
                                </div>
                            </div>

                            <Input
                                id="attachments"
                                type="file"
                                multiple
                                accept=".pdf,.jpg,.jpeg,.png,.webp"
                                onChange={(event) =>
                                    setData(
                                        'attachments',
                                        Array.from(event.target.files ?? []),
                                    )
                                }
                                className={fieldClass}
                            />

                            {data.attachments.length > 0 && (
                                <p className="mt-2 text-xs text-slate-500">
                                    {data.attachments.length} file
                                    {data.attachments.length !== 1
                                        ? 's'
                                        : ''}{' '}
                                    selected
                                </p>
                            )}

                            {errors.attachments && (
                                <p className="mt-2 text-xs text-red-600">
                                    {errors.attachments}
                                </p>
                            )}
                        </section>

                        {/* Notice */}
                        <div className="rounded-xl border border-ustp-gold/20 bg-ustp-gold/4 p-3 text-xs leading-5 text-slate-500">
                            After review, ICT admin may assign liability to
                            involved parties. You'll be notified of any
                            resulting action.
                        </div>

                        {/* Submit */}
                        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between md:p-5">
                            <div className="space-y-1.5">
                                <p className="text-xs font-medium text-slate-800">
                                    Ready to submit?
                                </p>

                                <ul className="space-y-1">
                                    {checklist.map((item) => (
                                        <li
                                            key={item.label}
                                            className="flex items-center gap-1.5 text-[11px]"
                                        >
                                            <span
                                                className={`flex size-3.5 items-center justify-center rounded-full ${
                                                    item.done
                                                        ? 'bg-emerald-100 text-emerald-600'
                                                        : 'bg-slate-100 text-slate-300'
                                                }`}
                                            >
                                                <Check className="size-2.5" />
                                            </span>
                                            <span
                                                className={
                                                    item.done
                                                        ? 'text-slate-500'
                                                        : 'text-slate-400'
                                                }
                                            >
                                                {item.label}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <Button
                                type="submit"
                                disabled={processing || !canSubmit}
                                className="h-10 bg-ustp-gold px-5 text-sm font-semibold text-ustp-navy shadow-lg shadow-ustp-gold/10 transition-all hover:bg-ustp-gold-dark hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {processing ? (
                                    <Spinner />
                                ) : (
                                    <Send className="size-4" />
                                )}
                                Submit Report
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
