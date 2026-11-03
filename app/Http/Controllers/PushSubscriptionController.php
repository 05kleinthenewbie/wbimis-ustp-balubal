<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePushSubscriptionRequest;
use App\Services\WebPushService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class PushSubscriptionController extends Controller
{
    public function show(WebPushService $push): JsonResponse
    {
        return response()->json([
            'configured' => $push->configured(),
            'publicKey' => $push->configured() ? config('services.webpush.public_key') : null,
        ]);
    }

    public function store(StorePushSubscriptionRequest $request, WebPushService $push): Response
    {
        abort_unless($push->configured(), 503, 'Push notifications are not configured yet.');
        $data = $request->validated();
        $hash = hash('sha256', $data['endpoint']);

        DB::table('push_subscriptions')->upsert([
            'endpoint_hash' => $hash,
            'user_id' => $request->user()->id,
            'endpoint' => $data['endpoint'],
            'public_key' => $data['keys']['p256dh'],
            'auth_token' => $data['keys']['auth'],
            'created_at' => now(),
            'updated_at' => now(),
        ], ['endpoint_hash'], ['user_id', 'endpoint', 'public_key', 'auth_token', 'updated_at']);

        return response()->noContent()->cookie('push_subscription', $hash, 525600, '/', null, $request->isSecure(), true, false, 'lax');
    }

    public function destroy(Request $request): Response
    {
        $data = $request->validate(['endpoint' => ['required', 'string', 'max:2048']]);
        DB::table('push_subscriptions')->where('user_id', $request->user()->id)
            ->where('endpoint_hash', hash('sha256', $data['endpoint']))->delete();

        return response()->noContent()->withoutCookie('push_subscription');
    }
}
