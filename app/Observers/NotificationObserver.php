<?php

namespace App\Observers;

use App\Jobs\SendPushNotification;
use App\Models\Notification;
use App\Services\WebPushService;

class NotificationObserver
{
    public function created(Notification $notification): void
    {
        if (app(WebPushService::class)->configured() && $notification->notification_status !== 'read') {
            SendPushNotification::dispatch($notification->id)->afterCommit();
        }
    }
}
