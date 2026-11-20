<?php

test('pwa manifest and offline assets are not deployed', function () {
    expect(file_exists(public_path('manifest.webmanifest')))->toBeFalse()
        ->and(file_exists(public_path('offline.html')))->toBeFalse()
        ->and(file_exists(public_path('icons/icon-192.png')))->toBeFalse();
});

test('the service worker remains push-only', function () {
    $worker = file_get_contents(public_path('push-service-worker.js'));

    expect($worker)
        ->toContain("addEventListener('push'")
        ->toContain("addEventListener('notificationclick'")
        ->not->toContain("addEventListener('fetch'")
        ->not->toContain('offline.html');
});

test('the root page does not link a web app manifest', function () {
    $this->get('/')
        ->assertOk()
        ->assertDontSee('manifest.webmanifest', false);
});
