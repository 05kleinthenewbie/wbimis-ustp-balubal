import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type PageHeaderProps = {
    title: string;
    description?: string;
    icon?: LucideIcon;
    actions?: ReactNode;
};

export function PageHeader({
    title,
    description,
    icon: Icon,
    actions,
}: PageHeaderProps) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
                {Icon && (
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ustp-navy/5 text-ustp-navy">
                        <Icon className="size-4.5" />
                    </div>
                )}

                <div className="min-w-0">
                    <h1 className="text-xl leading-tight font-semibold tracking-tight text-slate-800">
                        {title}
                    </h1>
                    {description && (
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                            {description}
                        </p>
                    )}
                </div>
            </div>

            {actions && (
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {actions}
                </div>
            )}
        </div>
    );
}

export default PageHeader;
