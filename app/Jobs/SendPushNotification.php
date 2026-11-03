<?php

namespace App\Jobs;

use App\Models\Notification;
use App\Services\WebPushService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

class SendPushNotification implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $notificationId) {}

    /**
     * Execute the job.
     */
    public function handle(WebPushService $push): void
    {
        $notification = Notification::find($this->notificationId);
        if ($notification === null) {
            return;
        }

        try {
            $push->send($notification);
        } catch (Throwable $exception) {
            $this->failed($exception);
        }
    }

    public function failed(?Throwable $exception): void
    {
        Log::warning('Browser push could not be delivered.', [
            'notification_id' => $this->notificationId,
            'exception_type' => $exception !== null ? $exception::class : null,
        ]);
    }
}
