import { Skeleton } from '@/components/ui/skeleton';

export function PageSkeleton() {
    return (
        <div
            className="pointer-events-auto absolute inset-0 z-20 overflow-hidden bg-slate-50 p-4 md:p-6 lg:p-8 dark:bg-background"
            aria-hidden="true"
            data-test="page-skeleton"
        >
            <div className="mx-auto max-w-7xl space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-48 rounded-md" />
                        <Skeleton className="h-3 w-32 rounded-md" />
                    </div>
                    <Skeleton className="h-9 w-28 rounded-lg" />
                </div>

                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton key={index} className="h-24 rounded-2xl" />
                    ))}
                </div>

                <Skeleton className="h-10 w-full max-w-md rounded-lg" />

                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-border dark:bg-card">
                    {Array.from({ length: 8 }).map((_, index) => (
                        <Skeleton
                            key={index}
                            className="h-12 w-full rounded-lg"
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
