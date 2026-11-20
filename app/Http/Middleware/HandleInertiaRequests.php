<?php

namespace App\Http\Middleware;

use App\Models\Booking;
use App\Models\JobOrder;
use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app-prod';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user()?->loadMissing('role');

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user,
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'flash' => [
                'status' => fn () => $request->session()->get('status'),
                'error' => fn () => $request->session()->get('error'),
            ],
            'unreadNotifications' => fn () => $user
                ? $user->systemNotifications()->where('notification_status', 'unread')->latest()->limit(10)->get()
                : [],
            'unreadNotificationsCount' => fn () => $user
                ? $user->systemNotifications()->where('notification_status', 'unread')->count()
                : 0,
            'pendingApprovalsCount' => fn () => $user?->isAdministrator()
                ? User::query()
                    ->where('is_technician', false)
                    ->where('approval_status', 'pending')
                    ->whereNotNull('email_verified_at')
                    ->whereNotIn('status', ['inactive', 'rejected'])
                    ->where('id', '!=', $user->id)
                    ->count()
                : 0,
            'pendingServiceRequestsCount' => fn () => $user?->isAdministrator()
                ? ServiceRequest::query()->where('request_status', 'pending')->count()
                : 0,
            'pendingBookingsCount' => fn () => $user?->isAdministrator()
                ? Booking::query()->where('booking_status', 'pending')->count()
                : 0,
            'unassignedJobOrdersCount' => fn () => $user?->isAdministrator()
                ? JobOrder::query()->whereNull('assigned_to')->count()
                : 0,
            'notifications' => fn () => $user
                ? $user->systemNotifications()->latest()->limit(20)->get()
                : [],
        ];
    }
}
