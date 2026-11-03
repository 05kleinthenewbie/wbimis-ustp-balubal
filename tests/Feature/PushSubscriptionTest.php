<?php

use App\Jobs\SendPushNotification;
use App\Models\Notification;
use App\Models\Role;
use App\Models\User;
use App\Services\WebPushService;
use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Middleware;
use GuzzleHttp\Psr7\Response;
use Illuminate\Auth\Events\Logout;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Minishlink\WebPush\MessageSentReport;
use Minishlink\WebPush\VAPID;
use Minishlink\WebPush\WebPush;

beforeEach(function () {
    config()->set('services.webpush', [
        'public_key' => 'test-public-key',
        'private_key' => 'test-private-key',
        'subject' => 'https://example.com',
    ]);
    Bus::fake([SendPushNotification::class]);
});

function pushSubscriptionPayload(string $endpoint = 'https://fcm.googleapis.com/fcm/send/test-device'): array
{
    return [
        'endpoint' => $endpoint,
        'keys' => ['p256dh' => str_repeat('A', 87), 'auth' => str_repeat('B', 22)],
    ];
}

test('guests cannot access push subscription endpoints', function () {
    $this->getJson(route('push-subscriptions.show'))->assertUnauthorized();
    $this->postJson(route('push-subscriptions.store'), pushSubscriptionPayload())->assertUnauthorized();
    $this->deleteJson(route('push-subscriptions.destroy'), pushSubscriptionPayload())->assertUnauthorized();
});

test('the vapid command generates environment configuration without changing saved keys', function () {
    $this->artisan('push:vapid')
        ->expectsOutputToContain('VAPID_PUBLIC_KEY=')
        ->expectsOutputToContain('VAPID_PRIVATE_KEY=')
        ->assertSuccessful();

    expect(config('services.webpush.private_key'))->toBe('test-private-key');
});

test('all portal roles can enable push notifications without duplicate subscriptions', function (string $roleName) {
    $role = Role::firstOrCreate(['role_name' => $roleName]);
    $user = User::factory()->create(['role_id' => $role->id]);

    $this->actingAs($user)->getJson(route('push-subscriptions.show'))
        ->assertOk()->assertExactJson(['configured' => true, 'publicKey' => 'test-public-key']);
    $this->postJson(route('push-subscriptions.store'), pushSubscriptionPayload())->assertNoContent();
    $this->postJson(route('push-subscriptions.store'), pushSubscriptionPayload())->assertNoContent();

    $this->assertDatabaseCount('push_subscriptions', 1);
    $this->assertDatabaseHas('push_subscriptions', ['user_id' => $user->id]);
})->with(['student', 'faculty_staff', 'ict_admin']);

test('push subscriptions reject arbitrary and non secure endpoints', function (string $endpoint) {
    $this->actingAs(User::factory()->create())
        ->postJson(route('push-subscriptions.store'), pushSubscriptionPayload($endpoint))
        ->assertUnprocessable()->assertJsonValidationErrors('endpoint');

    $this->assertDatabaseCount('push_subscriptions', 0);
})->with([
    'http://fcm.googleapis.com/fcm/send/device',
    'https://127.0.0.1/private',
    'https://fcm.googleapis.com.attacker.example/push',
    'https://fcm.googleapis.com:8443/push',
    'https://user:password@fcm.googleapis.com/push',
]);

test('push subscriptions validate encryption keys', function () {
    $payload = pushSubscriptionPayload();
    $payload['keys'] = ['p256dh' => 'invalid', 'auth' => 'invalid'];
    $this->actingAs(User::factory()->create())
        ->postJson(route('push-subscriptions.store'), $payload)
        ->assertUnprocessable()->assertJsonValidationErrors(['keys.p256dh', 'keys.auth']);
});

test('push enablement reports missing server configuration', function () {
    config()->set('services.webpush.private_key', null);
    $this->actingAs(User::factory()->create())
        ->getJson(route('push-subscriptions.show'))
        ->assertExactJson(['configured' => false, 'publicKey' => null]);
    $this->postJson(route('push-subscriptions.store'), pushSubscriptionPayload())->assertStatus(503);
    $this->assertDatabaseCount('push_subscriptions', 0);
});

test('a user can only disable their own browser subscriptions', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $this->actingAs($owner)->postJson(route('push-subscriptions.store'), pushSubscriptionPayload())->assertNoContent();
    $this->actingAs($otherUser)->deleteJson(route('push-subscriptions.destroy'), pushSubscriptionPayload())->assertNoContent();
    $this->assertDatabaseCount('push_subscriptions', 1);
    $this->actingAs($owner)->deleteJson(route('push-subscriptions.destroy'), pushSubscriptionPayload())->assertNoContent();
    $this->assertDatabaseCount('push_subscriptions', 0);
});

test('logging out detaches only the current browser subscription', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->postJson(route('push-subscriptions.store'), pushSubscriptionPayload())->assertNoContent();
    $this->postJson(route('push-subscriptions.store'), pushSubscriptionPayload('https://fcm.googleapis.com/fcm/send/second-device'))->assertNoContent();
    request()->cookies->set('push_subscription', hash('sha256', pushSubscriptionPayload()['endpoint']));

    event(new Logout('web', $user));

    $this->assertDatabaseCount('push_subscriptions', 1);
    $this->assertDatabaseHas('push_subscriptions', ['endpoint' => 'https://fcm.googleapis.com/fcm/send/second-device']);
});

test('new unread app notifications dispatch push delivery but read updates do not', function () {
    $user = User::factory()->create();
    $notification = Notification::create([
        'user_id' => $user->id,
        'message' => 'Your request has been approved.',
        'notification_status' => 'unread',
    ]);
    $notification->update(['notification_status' => 'read']);
    Notification::create(['user_id' => $user->id, 'message' => 'Historical message', 'notification_status' => 'read']);

    Bus::assertDispatchedTimes(SendPushNotification::class, 1);
    Bus::assertDispatched(SendPushNotification::class, fn ($job) => $job->notificationId === $notification->id && $job->afterCommit);
});

test('push delivery targets only the recipient and removes expired subscriptions', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $endpoint = pushSubscriptionPayload()['endpoint'];
    $this->actingAs($user)->postJson(route('push-subscriptions.store'), pushSubscriptionPayload())->assertNoContent();
    $this->actingAs($otherUser)->postJson(route('push-subscriptions.store'), pushSubscriptionPayload('https://fcm.googleapis.com/fcm/send/other-device'))->assertNoContent();
    $notification = Notification::create([
        'user_id' => $user->id, 'message' => 'Request approved', 'link' => '/requests/5', 'notification_status' => 'unread',
    ]);

    $report = Mockery::mock(MessageSentReport::class);
    $report->shouldReceive('isSubscriptionExpired')->once()->andReturn(true);
    $report->shouldReceive('getEndpoint')->once()->andReturn($endpoint);
    $client = Mockery::mock(WebPush::class);
    $client->shouldReceive('queueNotification')->once()->withArgs(function ($subscription, $payload) use ($endpoint) {
        return $subscription->getEndpoint() === $endpoint && json_decode($payload, true)['url'] === '/requests/5';
    });
    $client->shouldReceive('flush')->once()->andReturnUsing(function () use ($report): Generator {
        yield $report;
    });
    app()->instance(WebPush::class, $client);

    app(WebPushService::class)->send($notification);

    expect(DB::table('push_subscriptions')->where('user_id', $user->id)->exists())->toBeFalse();
    $this->assertDatabaseHas('push_subscriptions', ['user_id' => $otherUser->id]);
});

test('a push service failure does not break an app notification', function () {
    $notification = Notification::create([
        'user_id' => User::factory()->create()->id, 'message' => 'New update', 'notification_status' => 'unread',
    ]);
    $service = Mockery::mock(WebPushService::class);
    $service->shouldReceive('send')->once()->andThrow(new RuntimeException('Push service unavailable'));

    (new SendPushNotification($notification->id))->handle($service);

    $this->assertDatabaseHas('notifications', ['id' => $notification->id]);
});

test('web push encrypts and signs notification delivery with the configured vapid keys', function () {
    $keys = VAPID::createVapidKeys();
    $deviceKeys = VAPID::createVapidKeys();
    $history = [];
    $handler = HandlerStack::create(new MockHandler([new Response(201)]));
    $handler->push(Middleware::history($history));
    $client = new WebPush(['VAPID' => [
        'subject' => 'https://example.com', 'publicKey' => $keys['publicKey'], 'privateKey' => $keys['privateKey'],
    ]], [], new Client(['handler' => $handler]));
    app()->instance(WebPush::class, $client);

    $payload = pushSubscriptionPayload();
    $payload['keys']['p256dh'] = $deviceKeys['publicKey'];
    $payload['keys']['auth'] = rtrim(strtr(base64_encode(random_bytes(16)), '+/', '-_'), '=');
    $user = User::factory()->create();
    $this->actingAs($user)->postJson(route('push-subscriptions.store'), $payload)->assertNoContent();
    $notification = Notification::create([
        'user_id' => $user->id, 'message' => 'Request approved', 'notification_status' => 'unread',
    ]);

    app(WebPushService::class)->send($notification);

    expect($history)->toHaveCount(1)
        ->and($history[0]['request']->getHeaderLine('Authorization'))->toStartWith('vapid ')
        ->and($history[0]['request']->getHeaderLine('Content-Encoding'))->toBe('aes128gcm')
        ->and((string) $history[0]['request']->getBody())->not->toContain('Request approved');
    $this->assertDatabaseCount('push_subscriptions', 1);
});
