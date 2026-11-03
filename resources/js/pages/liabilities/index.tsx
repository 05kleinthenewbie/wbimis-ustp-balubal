import { Head, Link, router } from '@inertiajs/react';
import { CheckCheck, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { index, acknowledge } from '@/routes/liabilities';

type Liability = {
    id: number;
    incident_id: number;
    liability_description: string | null;
    liability_amount: string | null;
    liability_status: string;
    date_assigned: string;
    date_settled: string | null;
    acknowledged_at: string | null;
    incident_report: {
        incident_type: string;
        incident_date: string | null;
    } | null;
};

type Props = {
    liabilities: {
        data: Liability[];
        current_page: number;
        last_page: number;
        prev_page_url: string | null;
        next_page_url: string | null;
    };
    filters: { status: string; liability: number | null };
};

export default function MyLiabilities({ liabilities, filters }: Props) {
    const [processing, setProcessing] = useState<number | null>(null);

    function acknowledgeLiability(id: number) {
        setProcessing(id);
        router.post(
            acknowledge(id).url,
            {},
            { preserveScroll: true, onFinish: () => setProcessing(null) },
        );
    }

    return (
        <>
            <Head title="My Liabilities" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-8">
                <nav
                    aria-label="Filter liabilities"
                    className="flex flex-wrap gap-2"
                >
                    {['all', 'pending', 'settled', 'waived'].map((status) => (
                        <Button
                            asChild
                            key={status}
                            variant={
                                filters.status === status
                                    ? 'default'
                                    : 'outline'
                            }
                        >
                            <Link
                                href={index({ query: { status } })}
                                aria-current={
                                    filters.status === status
                                        ? 'page'
                                        : undefined
                                }
                                className="capitalize"
                            >
                                {status}
                            </Link>
                        </Button>
                    ))}
                </nav>
                {filters.liability && (
                    <Link href={index()} className="text-sm underline">
                        View all my liabilities
                    </Link>
                )}
                <p className="rounded-xl border border-ustp-gold/30 bg-ustp-gold/5 p-4 text-sm text-muted-foreground">
                    Acknowledgment confirms that you have received the
                    assignment. It does not settle the liability or process a
                    payment. Only the ICT Administrator can mark it settled or
                    waived.
                </p>
                {liabilities.data.length === 0 ? (
                    <div className="rounded-2xl border bg-card p-12 text-center">
                        <ShieldAlert className="mx-auto mb-3 size-10 text-muted-foreground" />
                        <h2 className="text-lg font-semibold">
                            No liabilities found
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Liabilities assigned to your account will appear
                            here.
                        </p>
                    </div>
                ) : (
                    liabilities.data.map((liability) => (
                        <article
                            key={liability.id}
                            className="rounded-2xl border bg-card p-5 shadow-sm md:p-6"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-semibold">
                                        Liability #{liability.id}
                                    </h2>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Incident #{liability.incident_id} ·{' '}
                                        {liability.incident_report
                                            ?.incident_type ??
                                            'Laboratory incident'}
                                    </p>
                                </div>
                                <span className="rounded-full border px-3 py-1 text-xs font-medium capitalize">
                                    {liability.liability_status}
                                </span>
                            </div>
                            <p className="mt-4 text-sm wrap-break-word whitespace-pre-wrap">
                                {liability.liability_description ??
                                    'No additional description provided.'}
                            </p>
                            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                                <div>
                                    <dt className="text-muted-foreground">
                                        Assessed amount
                                    </dt>
                                    <dd className="font-semibold">
                                        {liability.liability_amount === null
                                            ? 'Not specified'
                                            : new Intl.NumberFormat('en-PH', {
                                                  style: 'currency',
                                                  currency: 'PHP',
                                              }).format(
                                                  Number(
                                                      liability.liability_amount,
                                                  ),
                                              )}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">
                                        Assigned
                                    </dt>
                                    <dd>
                                        {new Date(
                                            liability.date_assigned,
                                        ).toLocaleString()}
                                    </dd>
                                </div>
                                {liability.date_settled && (
                                    <div>
                                        <dt className="text-muted-foreground">
                                            Resolved
                                        </dt>
                                        <dd>
                                            {new Date(
                                                liability.date_settled,
                                            ).toLocaleString()}
                                        </dd>
                                    </div>
                                )}
                            </dl>
                            <div className="mt-5 border-t pt-4">
                                {liability.acknowledged_at ? (
                                    <p className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                                        <CheckCheck className="size-4" />
                                        Acknowledged on{' '}
                                        {new Date(
                                            liability.acknowledged_at,
                                        ).toLocaleString()}
                                    </p>
                                ) : liability.liability_status === 'pending' ? (
                                    <Button
                                        disabled={processing !== null}
                                        onClick={() =>
                                            acknowledgeLiability(liability.id)
                                        }
                                    >
                                        {processing === liability.id
                                            ? 'Acknowledging…'
                                            : 'Acknowledge assignment'}
                                    </Button>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        No acknowledgment required.
                                    </p>
                                )}
                            </div>
                        </article>
                    ))
                )}
                {liabilities.last_page > 1 && (
                    <div className="flex items-center justify-between gap-3">
                        <Button
                            variant="outline"
                            disabled={!liabilities.prev_page_url}
                            onClick={() =>
                                liabilities.prev_page_url &&
                                router.visit(liabilities.prev_page_url)
                            }
                        >
                            Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            Page {liabilities.current_page} of{' '}
                            {liabilities.last_page}
                        </span>
                        <Button
                            variant="outline"
                            disabled={!liabilities.next_page_url}
                            onClick={() =>
                                liabilities.next_page_url &&
                                router.visit(liabilities.next_page_url)
                            }
                        >
                            Next
                        </Button>
                    </div>
                )}
            </div>
        </>
    );
}
