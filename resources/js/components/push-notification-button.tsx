import { usePage } from '@inertiajs/react';
import { BellPlus, BellRing, LoaderCircle } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { destroy, show, store } from '@/routes/push-subscriptions';

type PushConfiguration = { configured: boolean; publicKey: string | null };

const subscribeToSupport = () => () => {};
const supportsPush = () =>
    window.isSecureContext &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window;

function applicationServerKey(value: string): ArrayBuffer {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));

    return Uint8Array.from(decoded, (character) => character.charCodeAt(0))
        .buffer;
}

async function saveSubscription(
    subscription: PushSubscription,
    method: 'POST' | 'DELETE',
): Promise<void> {
    const token = document.cookie
        .split('; ')
        .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
        ?.slice('XSRF-TOKEN='.length);
    const response = await fetch(
        method === 'POST' ? store.url() : destroy.url(),
        {
            method,
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-XSRF-TOKEN': token ? decodeURIComponent(token) : '',
            },
            body: JSON.stringify(
                method === 'POST'
                    ? subscription.toJSON()
                    : { endpoint: subscription.endpoint },
            ),
        },
    );

    if (!response.ok) {
        throw new Error(
            'Could not save your push notification preference. Please try again.',
        );
    }
}

export function PushNotificationButton() {
    const { auth } = usePage().props;
    const [configuration, setConfiguration] =
        useState<PushConfiguration | null>(null);
    const supported = useSyncExternalStore(
        subscribeToSupport,
        supportsPush,
        () => false,
    );
    const [enabled, setEnabled] = useState(false);
    const [busy, setBusy] = useState(true);

    useEffect(() => {
        let cancelled = false;

        if (!supported) {
            return;
        }

        async function initialize() {
            try {
                const response = await fetch(show.url(), {
                    headers: { Accept: 'application/json' },
                    credentials: 'same-origin',
                });

                if (!response.ok) {
                    throw new Error('Push configuration could not be loaded.');
                }

                const config: PushConfiguration = await response.json();

                if (cancelled) {
                    return;
                }

                setConfiguration(config);

                const registration =
                    await navigator.serviceWorker.getRegistration(
                        '/push-service-worker.js',
                    );
                const subscription =
                    await registration?.pushManager.getSubscription();

                if (
                    !cancelled &&
                    config.configured &&
                    subscription &&
                    Notification.permission === 'granted'
                ) {
                    await saveSubscription(subscription, 'POST');

                    if (!cancelled) {
                        setEnabled(true);
                    }
                }
            } catch {
                if (!cancelled) {
                    setConfiguration(null);
                }
            } finally {
                if (!cancelled) {
                    setBusy(false);
                }
            }
        }

        void initialize();

        return () => {
            cancelled = true;
        };
    }, [auth.user.id, supported]);

    async function togglePush() {
        if (!configuration?.configured || !configuration.publicKey) {
            toast.error(
                'Push notifications need VAPID keys configured on the server.',
            );

            return;
        }

        setBusy(true);

        try {
            if (enabled) {
                const registration =
                    await navigator.serviceWorker.getRegistration(
                        '/push-service-worker.js',
                    );
                const subscription =
                    await registration?.pushManager.getSubscription();

                if (subscription) {
                    await saveSubscription(subscription, 'DELETE');
                    await subscription.unsubscribe();
                }

                setEnabled(false);
                toast.success('Push notifications disabled on this browser.');

                return;
            }

            const permission = await Notification.requestPermission();

            if (permission !== 'granted') {
                toast.error(
                    permission === 'denied'
                        ? 'Notifications are blocked. Allow them in your browser site settings, then try again.'
                        : 'Notification permission was not granted.',
                );

                return;
            }

            await navigator.serviceWorker.register('/push-service-worker.js', {
                scope: '/',
            });
            const registration = await navigator.serviceWorker.ready;
            const subscription =
                (await registration.pushManager.getSubscription()) ??
                (await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: applicationServerKey(
                        configuration.publicKey,
                    ),
                }));
            await saveSubscription(subscription, 'POST');
            setEnabled(true);
            toast.success('Push notifications enabled on this browser.');
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Could not enable push notifications. Please try again.',
            );
        } finally {
            setBusy(false);
        }
    }

    const label = enabled
        ? 'Push Notifications Enabled'
        : 'Enable Push Notifications';

    return (
        <Button
            type="button"
            onClick={() => void togglePush()}
            disabled={!supported || busy}
            aria-label={label}
            aria-pressed={enabled}
            title={
                !supported
                    ? 'Push notifications require HTTPS and a supported browser. On iPhone or iPad, add the portal to your Home Screen first.'
                    : enabled
                      ? 'Disable push notifications on this browser'
                      : label
            }
            className="h-9 shrink-0 rounded-lg bg-ustp-gold px-2.5 text-xs font-semibold text-ustp-navy hover:bg-ustp-gold-light sm:px-3"
        >
            {busy && supported ? (
                <LoaderCircle className="size-4 animate-spin" />
            ) : enabled ? (
                <BellRing className="size-4" />
            ) : (
                <BellPlus className="size-4" />
            )}
            <span className="hidden sm:inline">
                {enabled ? 'Push Enabled' : 'Enable Push Notifications'}
            </span>
        </Button>
    );
}
