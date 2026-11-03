self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
    let payload = {};

    try {
        payload = event.data?.json() ?? {};
    } catch {
        payload = {};
    }

    event.waitUntil(
        self.registration.showNotification(
            payload.title || 'USTP Balubal ICT Portal',
            {
                body:
                    payload.body ||
                    'You have a new notification in the ICT portal.',
                tag: payload.tag || 'ict-portal-update',
                data: { url: payload.url || '/notifications' },
            },
        ),
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    let url = new URL('/notifications', self.location.origin);

    try {
        const target = new URL(
            event.notification.data?.url || '/notifications',
            self.location.origin,
        );
        if (target.origin === self.location.origin) {
            url = target;
        }
    } catch {
        // Invalid links fall back to the portal's notification history.
    }

    event.waitUntil(
        self.clients
            .matchAll({ type: 'window', includeUncontrolled: true })
            .then(async (clients) => {
                const client = clients.find(
                    (window) =>
                        new URL(window.url).origin === self.location.origin,
                );

                if (client) {
                    await client.navigate(url.href);
                    return client.focus();
                }

                return self.clients.openWindow(url.href);
            }),
    );
});
