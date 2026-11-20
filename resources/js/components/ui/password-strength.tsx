import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

const CELL = {
    type: 'spring',
    stiffness: 520,
    damping: 34,
    mass: 0.45,
} as const;
const INSTANT = { duration: 0 } as const;

const COMMON =
    /^(?:password|passw0rd|qwerty|letmein|welcome|admin|iloveyou|monkey|dragon|abc123|111111|123123|123456)/i;
const RUN = /(.)\1{3,}/;
const RUN_UP =
    /(?:0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|defg|qwer|wert|erty|asdf)/i;
const SYMBOL = /[!-/:-@[-`{-~]/;

export type PasswordRule = {
    id: string;
    label: string;
    test: (value: string) => boolean;
};

export type EvaluatedRule = PasswordRule & { met: boolean };

export type UsePasswordStrengthOptions = {
    rules?: readonly PasswordRule[];
    labels?: readonly string[];
    announceDelay?: number;
};

export type PasswordStrengthState = {
    score: number;
    max: number;
    label: string;
    rules: EvaluatedRule[];
    guessable: boolean;
    announcement: string;
};

export const defaultPasswordRules: readonly PasswordRule[] = [
    {
        id: 'length',
        label: 'At least 8 characters long',
        test: (v) => v.length >= 8,
    },
    {
        id: 'uppercase',
        label: 'Has 1 capital letter (A, B, C)',
        test: (v) => /[A-Z]/.test(v),
    },
    {
        id: 'digit',
        label: 'Has 1 number (1, 2, 3)',
        test: (v) => /\d/.test(v),
    },
    {
        id: 'symbol',
        label: 'Has 1 symbol (@, #, $)',
        test: (v) => SYMBOL.test(v),
    },
];

const defaultLabels = ['Empty', 'Weak', 'Fair', 'Good', 'Strong'] as const;

export function usePasswordStrength(
    value: string,
    {
        rules = defaultPasswordRules,
        labels = defaultLabels,
        announceDelay = 700,
    }: UsePasswordStrengthOptions = {},
): PasswordStrengthState {
    const state = useMemo(() => {
        const evaluated = rules.map((rule) => ({
            ...rule,
            met: rule.test(value),
        }));
        const passed = evaluated.reduce((n, r) => n + (r.met ? 1 : 0), 0);
        const guessable =
            value.length > 0 &&
            (COMMON.test(value) ||
                RUN.test(value) ||
                RUN_UP.test(value));

        const score =
            value.length === 0
                ? 0
                : Math.min(rules.length, Math.max(1, passed));

        const label = labels[Math.min(score, labels.length - 1)] ?? '';
        const unmet = evaluated.filter((r) => !r.met);

        const announcement =
            value.length === 0
                ? ''
                : [
                      `Password strength ${label.toLowerCase()}.`,
                      guessable
                          ? 'This is a commonly guessed pattern.'
                          : '',
                      unmet.length === 0
                          ? 'All requirements met.'
                          : `Still needed: ${unmet
                                .map((r) => r.label.toLowerCase())
                                .join(', ')}.`,
                  ]
                      .filter(Boolean)
                      .join(' ');

        return {
            score,
            max: rules.length,
            label,
            rules: evaluated,
            guessable,
            announcement,
        };
    }, [value, rules, labels]);

    const [settled, setSettled] = useState('');

    useEffect(() => {
        if (state.announcement === '') {
            setSettled('');
            return;
        }
        const id = setTimeout(
            () => setSettled(state.announcement),
            announceDelay,
        );
        return () => clearTimeout(id);
    }, [state.announcement, announceDelay]);

    return { ...state, announcement: settled };
}

export type PasswordStrengthProps = {
    value: string;
    confirmation?: string;
    rules?: readonly PasswordRule[];
    labels?: readonly string[];
    announceDelay?: number;
    showRules?: boolean;
    className?: string;
};

const TONES = {
    none: {
        bar: 'bg-stone-300 dark:bg-white/20',
        text: 'text-stone-500 dark:text-stone-400',
    },
    danger: {
        bar: 'bg-red-500',
        text: 'text-red-600 dark:text-red-400',
    },
    caution: {
        bar: 'bg-amber-500',
        text: 'text-amber-600 dark:text-amber-400',
    },
    safe: {
        bar: 'bg-emerald-500',
        text: 'text-emerald-600 dark:text-emerald-400',
    },
} as const;

function toneFor(score: number, max: number) {
    if (score === 0) return TONES.none;
    const ratio = score / max;
    if (ratio <= 0.34) return TONES.danger;
    if (ratio <= 0.67) return TONES.caution;
    return TONES.safe;
}

export function PasswordStrength({
    value,
    confirmation,
    rules = defaultPasswordRules,
    labels = defaultLabels,
    announceDelay = 700,
    showRules = true,
    className = '',
}: PasswordStrengthProps) {
    const {
        score,
        max,
        label,
        rules: evaluated,
        announcement,
    } = usePasswordStrength(value, { rules, labels, announceDelay });
    const reduced = useReducedMotion();
    const tone = toneFor(score, max);

    return (
        <div className={`w-full ${className}`}>
            <div
                role="meter"
                aria-label="Password strength"
                aria-valuemin={0}
                aria-valuemax={max}
                aria-valuenow={score}
                aria-valuetext={label}
                className="grid gap-1.5"
                style={{
                    gridTemplateColumns: `repeat(${max}, minmax(0, 1fr))`,
                }}
            >
                {Array.from({ length: max }, (_, i) => (
                    <div
                        key={i}
                        className="relative h-1.5 overflow-hidden rounded-[2px] bg-stone-200 dark:bg-white/12"
                    >
                        <motion.span
                            className={`absolute inset-0 origin-left rounded-[2px] transition-colors duration-200 ${tone.bar}`}
                            initial={false}
                            animate={{ scaleX: i < score ? 1 : 0 }}
                            transition={
                                reduced
                                    ? INSTANT
                                    : {
                                          ...CELL,
                                          delay: i < score ? i * 0.03 : 0,
                                      }
                            }
                        />
                    </div>
                ))}
            </div>

            {showRules && (
                <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                    {evaluated.map((rule) => (
                        <li
                            key={rule.id}
                            className="flex items-start gap-1.5"
                        >
                            <span
                                className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                                    rule.met
                                        ? 'bg-emerald-500'
                                        : 'bg-stone-300 dark:bg-white/25'
                                }`}
                            />
                            <span
                                className={`text-[12px] leading-5 transition-colors duration-200 ${
                                    rule.met
                                        ? 'font-medium text-emerald-600 dark:text-emerald-400'
                                        : 'text-stone-500 dark:text-stone-400'
                                }`}
                            >
                                {rule.label}
                            </span>
                            <span className="sr-only">
                                {rule.met ? 'met' : 'not met'}
                            </span>
                        </li>
                    ))}
                </ul>
            )}

            {confirmation !== undefined &&
                value.length > 0 &&
                confirmation.length > 0 && (
                    <p
                        className={`mt-2 flex items-center gap-1.5 text-[12px] font-medium ${
                            value === confirmation
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400'
                        }`}
                    >
                        <span
                            className={`size-1.5 shrink-0 rounded-full ${
                                value === confirmation
                                    ? 'bg-emerald-500'
                                    : 'bg-red-500'
                            }`}
                        />
                        {value === confirmation
                            ? 'Passwords match'
                            : 'Passwords do not match'}
                    </p>
                )}

            <p aria-live="polite" className="sr-only">
                {announcement}
            </p>
        </div>
    );
}

export default PasswordStrength;
