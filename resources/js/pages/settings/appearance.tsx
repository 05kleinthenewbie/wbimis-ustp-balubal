import { Head } from '@inertiajs/react';
import { Monitor, Moon, Package, Palette, Sun } from 'lucide-react';
import { useState } from 'react';
import { useAppearance } from '@/hooks/use-appearance';
import type { Appearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';

const themeOptions: { value: Appearance; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
];

function ToggleSwitch({
    checked,
    onChange,
}: {
    checked: boolean;
    onChange: (checked: boolean) => void;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                checked ? 'bg-ustp-navy' : 'bg-slate-200',
            )}
        >
            <span
                className={cn(
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    checked ? 'translate-x-5' : 'translate-x-0',
                )}
            />
        </button>
    );
}

export default function Appearance() {
    const { appearance, updateAppearance } = useAppearance();
    const [compactView, setCompactView] = useState(false);
    const [highContrast, setHighContrast] = useState(true);

    return (
        <>
            <Head title="Appearance settings" />

            <div className="grid grid-cols-1 items-start gap-8">
                {/* Left Main Appearance Card */}
                <div className="space-y-8 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
                    {/* Card Header */}
                    <div className="flex items-start gap-4 border-b border-slate-100 pb-6">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700">
                            <Palette className="size-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">
                                Appearance settings
                            </h2>
                            <p className="text-sm text-slate-500">
                                Update the appearance settings for your account
                            </p>
                        </div>
                    </div>

                    {/* Interface Theme Section */}
                    <div className="space-y-3">
                        <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase">
                            Interface Theme
                        </label>

                        <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-slate-200 bg-slate-100/90 p-1.5">
                            {themeOptions.map(
                                ({ value, label, icon: Icon }) => {
                                    const active = appearance === value;

                                    return (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() =>
                                                updateAppearance(value)
                                            }
                                            className={cn(
                                                'flex cursor-pointer items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-sm transition-all sm:px-4',
                                                active
                                                    ? 'border border-slate-200/60 bg-white font-semibold text-slate-900 shadow-sm'
                                                    : 'font-medium text-slate-600 hover:bg-slate-200/50 hover:text-slate-900',
                                            )}
                                        >
                                            <Icon
                                                className={cn(
                                                    'size-4',
                                                    !active && 'text-slate-400',
                                                    active &&
                                                        value === 'light' &&
                                                        'text-amber-500',
                                                    active &&
                                                        value === 'dark' &&
                                                        'text-slate-800',
                                                    active &&
                                                        value === 'system' &&
                                                        'text-slate-600',
                                                )}
                                            />
                                            <span>{label}</span>
                                        </button>
                                    );
                                },
                            )}
                        </div>
                    </div>

                    {/* Live Preview Section */}
                    <div className="space-y-3">
                        <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase">
                            Live Preview
                        </label>

                        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-5">
                            <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                                <div className="flex min-w-0 items-center gap-3.5">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-600">
                                        <Package className="size-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="truncate text-sm font-semibold text-slate-900">
                                            Balubal Lab 302 Reservation
                                        </h4>
                                        <p className="mt-0.5 text-xs text-slate-400">
                                            ICT Request #2024-049
                                        </p>
                                    </div>
                                </div>
                                <span className="inline-flex shrink-0 items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                    Active
                                </span>
                            </div>

                            <div className="flex items-center justify-between px-1 text-xs">
                                <span className="text-slate-500">
                                    Interface Tone:{' '}
                                    <strong className="font-semibold text-slate-800">
                                        Crisp White &amp; Navy
                                    </strong>
                                </span>
                                <span className="font-bold text-ustp-gold-dark">
                                    Applied
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Accessibility & View Options Section */}
                    <div className="space-y-6 border-t border-slate-100 pt-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="space-y-0.5">
                                <h4 className="text-sm font-semibold text-slate-900">
                                    Compact View Mode
                                </h4>
                                <p className="text-xs text-slate-500">
                                    Reduce list and card spacing for higher
                                    information density
                                </p>
                            </div>
                            <ToggleSwitch
                                checked={compactView}
                                onChange={setCompactView}
                            />
                        </div>

                        <div className="flex items-center justify-between gap-4">
                            <div className="space-y-0.5">
                                <h4 className="text-sm font-semibold text-slate-900">
                                    High Contrast Text
                                </h4>
                                <p className="text-xs text-slate-500">
                                    Enhance clarity and contrast under bright
                                    ambient sunlight
                                </p>
                            </div>
                            <ToggleSwitch
                                checked={highContrast}
                                onChange={setHighContrast}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

Appearance.layout = {
    breadcrumbs: [
        {
            title: 'Appearance settings',
            href: editAppearance(),
        },
    ],
};
