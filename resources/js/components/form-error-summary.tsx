import { AlertTriangle } from 'lucide-react';

type Props = {
    errors: Record<string, string | undefined>;
    labels?: Record<string, string>;
    className?: string;
};

export default function FormErrorSummary({
    errors,
    labels = {},
    className,
}: Props) {
    const entries = Object.entries(errors ?? {}).filter(([, message]) =>
        Boolean(message),
    );

    if (entries.length === 0) {
        return null;
    }

    return (
        <div
            role="alert"
            data-test="form-error-summary"
            className={`rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-300 ${className ?? ''}`}
        >
            <p className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="size-4 shrink-0" />
                {entries.length === 1
                    ? 'Please fix the highlighted field:'
                    : 'Please fix the highlighted fields:'}
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
                {entries.map(([field, message]) => (
                    <li key={field}>
                        <span className="font-medium">
                            {labels[field] ??
                                field
                                    .replace(/\.\d+\./g, ' ')
                                    .replace(/[_.]/g, ' ')
                                    .replace(/\b\w/g, (letter) =>
                                        letter.toUpperCase(),
                                    )}
                        </span>
                        : {message}
                    </li>
                ))}
            </ul>
        </div>
    );
}
