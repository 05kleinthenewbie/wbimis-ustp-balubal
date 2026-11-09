import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

function worker() {
    const handlers = {};
    const shown = [];
    const opened = [];
    const self = {
        location: { origin: 'https://portal.example' },
        addEventListener: (event, handler) => {
            handlers[event] = handler;
        },
        registration: {
            showNotification: async (title, options) => {
                shown.push({ title, ...options });
            },
        },
        clients: {
            matchAll: async () => [],
            openWindow: async (url) => {
                opened.push(url);
            },
        },
    };
    runInNewContext(
        readFileSync(
            new URL('../public/push-service-worker.js', import.meta.url),
            'utf8',
        ),
        { self, URL },
    );

    return { handlers, shown, opened, self };
}

test('push displays a notification with the supplied deep link and deduplication tag', async () => {
    const { handlers, shown } = worker();
    let pending;
    handlers.push({
        data: {
            json: () => ({
                title: 'Update',
                body: 'Approved',
                url: '/requests/7',
                tag: 'notification-1',
            }),
        },
        waitUntil: (promise) => {
            pending = promise;
        },
    });
    await pending;
    assert.equal(shown[0].body, 'Approved');
    assert.equal(shown[0].data.url, '/requests/7');
    assert.equal(shown[0].tag, 'notification-1');
});

test('malformed push payloads still display a safe fallback notification', async () => {
    const { handlers, shown } = worker();
    let pending;
    handlers.push({
        data: {
            json: () => {
                throw new Error('invalid JSON');
            },
        },
        waitUntil: (promise) => {
            pending = promise;
        },
    });
    await pending;
    assert.equal(shown[0].title, 'USTP Balubal ICT Portal');
    assert.equal(shown[0].data.url, '/notifications');
});

test('notification clicks never open external origins', async () => {
    const { handlers, opened } = worker();
    let pending;
    handlers.notificationclick({
        notification: { close() {}, data: { url: 'https://attacker.example' } },
        waitUntil: (promise) => {
            pending = promise;
        },
    });
    await pending;
    assert.equal(opened[0], 'https://portal.example/notifications');
});

test('notification clicks focus an existing portal tab and navigate to the record', async () => {
    const { handlers, self, opened } = worker();
    let pending;
    let navigated;
    let focused = false;
    self.clients.matchAll = async () => [
        {
            url: 'https://portal.example/dashboard',
            navigate: async (url) => {
                navigated = url;
            },
            focus: async () => {
                focused = true;
            },
        },
    ];
    handlers.notificationclick({
        notification: { close() {}, data: { url: '/bookings/3' } },
        waitUntil: (promise) => {
            pending = promise;
        },
    });
    await pending;
    assert.equal(navigated, 'https://portal.example/bookings/3');
    assert.equal(focused, true);
    assert.equal(opened.length, 0);
});
