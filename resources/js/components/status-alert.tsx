import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const ALERT_PATTERN =
    /\bpending\b|awaiting|deactivat|not approved|roster|expired|contact the ICT|try again|too many|review|reject|unverified/i;

export function isAlertMessage(message: string): boolean {
    return ALERT_PATTERN.test(message);
}

type StatusAlertVariant = 'auto' | 'warning' | 'success' | 'error';

type StatusAlertProps = {
    message: string;
    className?: string;
    variant?: StatusAlertVariant;
};

const variantStyles: Record<Exclude<StatusAlertVariant, 'auto'>, string> = {
    warning:
        'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/50 dark:text-amber-300',
    success:
        'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400',
    error: 'border-red-300 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-950/50 dark:text-red-400',
};

const variantIcons = {
    warning: AlertTriangle,
    success: CheckCircle2,
    error: XCircle,
};

export default function StatusAlert({
    message,
    className,
    variant = 'auto',
}: StatusAlertProps) {
    const resolved =
        variant === 'auto'
            ? isAlertMessage(message)
                ? 'warning'
                : 'success'
            : variant;
    const Icon = variantIcons[resolved];

    return (
        <div
            role="alert"
            className={cn(
                'flex items-start gap-2 rounded-lg border px-4 py-3 text-sm font-medium',
                variantStyles[resolved],
                className,
            )}
        >
            <Icon className="mt-0.5 size-4 shrink-0" />
            <span>{message}</span>
        </div>
    );
}
