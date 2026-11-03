import { Head, Link, router } from '@inertiajs/react';
import { Bell, Check, CheckCheck, ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { index, read, readAll, destroy } from '@/routes/notifications';

type Notification = {
    id: number;
    message: string;
    notification_type: string | null;
    notification_status: 'read' | 'unread';
    link: string | null;
    created_at: string;
};

type Props = {
    notificationHistory: {
        data: Notification[];
        current_page: number;
        last_page: number;
        prev_page_url: string | null;
        next_page_url: string | null;
    };
    counts: Record<'all' | 'read' | 'unread', number>;
    filters: { status: 'all' | 'read' | 'unread' };
};

export default function Notifications({
    notificationHistory,
    counts,
    filters,
}: Props) {
    function openNotification(notification: Notification) {
        if (notification.notification_status === 'unread') {
            router.post(
                read(notification.id).url,
                {},
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        if (notification.link) {
                            router.visit(notification.link);
                        }
                    },
                },
            );
        } else if (notification.link) {
            router.visit(notification.link);
        }
    }

    return (
        <>
            <Head title="Notifications" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-8">
                <div className="flex justify-end">
                    <Button
                        disabled={counts.unread === 0}
                        onClick={() =>
                            router.post(
                                readAll().url,
                                {},
                                { preserveScroll: true },
                            )
                        }
                    >
                        <CheckCheck className="size-4" /> Mark all as read
                    </Button>
                </div>

                <nav
                    aria-label="Filter notifications"
                    className="flex flex-wrap gap-2"
                >
                    {(['all', 'unread', 'read'] as const).map((status) => (
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
                                preserveScroll
                                aria-current={
                                    filters.status === status
                                        ? 'page'
                                        : undefined
                                }
                            >
                                <span className="capitalize">{status}</span>
                                <span>{counts[status]}</span>
                            </Link>
                        </Button>
                    ))}
                </nav>

                <section
                    aria-label="Notification list"
                    className="overflow-hidden rounded-2xl border bg-card shadow-sm"
                >
                    {notificationHistory.data.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                            <Bell className="size-10 text-muted-foreground" />
                            <h2 className="text-lg font-semibold">
                                No{' '}
                                {filters.status === 'all'
                                    ? ''
                                    : `${filters.status} `}
                                notifications
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Updates about your account and ICT transactions
                                will appear here.
                            </p>
                        </div>
                    ) : (
                        notificationHistory.data.map((notification) => (
                            <article
                                key={notification.id}
                                className={cn(
                                    'flex flex-wrap items-start gap-4 border-b p-5 last:border-0',
                                    notification.notification_status ===
                                        'unread' && 'bg-ustp-gold/5',
                                )}
                            >
                                <Bell className="mt-1 size-5 shrink-0 text-ustp-gold-dark" />
                                <button
                                    onClick={() =>
                                        openNotification(notification)
                                    }
                                    className="min-w-0 flex-1 text-left"
                                >
                                    <p
                                        className={cn(
                                            'text-sm leading-relaxed wrap-break-word',
                                            notification.notification_status ===
                                                'unread' && 'font-semibold',
                                        )}
                                    >
                                        {notification.message}
                                    </p>
                                    <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                        <time
                                            dateTime={notification.created_at}
                                        >
                                            {new Date(
                                                notification.created_at,
                                            ).toLocaleString()}
                                        </time>
                                        <span>
                                            {notification.notification_status ===
                                            'unread'
                                                ? 'Unread'
                                                : 'Read'}
                                        </span>
                                        {notification.link && (
                                            <ExternalLink className="size-3" />
                                        )}
                                    </span>
                                </button>
                                <div className="flex gap-1">
                                    {notification.notification_status ===
                                        'unread' && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            aria-label="Mark as read"
                                            onClick={() =>
                                                router.post(
                                                    read(notification.id).url,
                                                    {},
                                                    { preserveScroll: true },
                                                )
                                            }
                                        >
                                            <Check className="size-4" />
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label="Delete notification"
                                        onClick={() =>
                                            router.delete(
                                                destroy(notification.id).url,
                                                { preserveScroll: true },
                                            )
                                        }
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            </article>
                        ))
                    )}
                </section>

                {notificationHistory.last_page > 1 && (
                    <div className="flex items-center justify-between gap-3">
                        <Button
                            disabled={!notificationHistory.prev_page_url}
                            variant="outline"
                            onClick={() =>
                                notificationHistory.prev_page_url &&
                                router.visit(
                                    notificationHistory.prev_page_url,
                                    { preserveScroll: true },
                                )
                            }
                        >
                            Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            Page {notificationHistory.current_page} of{' '}
                            {notificationHistory.last_page}
                        </span>
                        <Button
                            disabled={!notificationHistory.next_page_url}
                            variant="outline"
                            onClick={() =>
                                notificationHistory.next_page_url &&
                                router.visit(
                                    notificationHistory.next_page_url,
                                    { preserveScroll: true },
                                )
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
