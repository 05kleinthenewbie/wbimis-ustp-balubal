<?php

namespace App\Services;

use App\Models\Notification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

class WebPushService
{
    public function configured(): bool
    {
        return filled(config('services.webpush.public_key'))
            && filled(config('services.webpush.private_key'))
            && filled(config('services.webpush.subject'));
    }

    public function send(Notification $notification): void
    {
        if (! $this->configured()) {
            return;
        }

        $subscriptions = DB::table('push_subscriptions')->where('user_id', $notification->user_id)->get();
        if ($subscriptions->isEmpty()) {
            return;
        }

        $push = app(WebPush::class);
        $payload = json_encode([
            'title' => 'USTP Balubal ICT Portal',
            'body' => Str::limit($notification->message, 300),
            'url' => $notification->link ?: route('notifications.index', [], false),
            'tag' => 'notification-'.$notification->id,
        ], JSON_THROW_ON_ERROR);

        foreach ($subscriptions as $subscription) {
            $push->queueNotification(Subscription::create([
                'endpoint' => $subscription->endpoint,
                'contentEncoding' => 'aes128gcm',
                'keys' => ['p256dh' => $subscription->public_key, 'auth' => $subscription->auth_token],
            ]), $payload);
        }

        foreach ($push->flush() as $report) {
            if ($report->isSubscriptionExpired()) {
                DB::table('push_subscriptions')->where('user_id', $notification->user_id)
                    ->where('endpoint_hash', hash('sha256', $report->getEndpoint()))->delete();
            } elseif (! $report->isSuccess()) {
                Log::warning('Browser push delivery failed.', ['notification_id' => $notification->id]);
            }
        }
    }
}
