<?php

use App\Models\Notification;
use App\Models\Role;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('notification page is private and paginated for every portal role', function (string $roleName) {
    $role = Role::firstOrCreate(['role_name' => $roleName]);
    $user = User::factory()->create(['role_id' => $role->id]);
    $otherUser = User::factory()->create();
    Notification::create(['user_id' => $otherUser->id, 'message' => 'Private other notification', 'notification_status' => 'unread']);
    for ($i = 0; $i < 25; $i++) {
        Notification::create(['user_id' => $user->id, 'message' => 'My notification '.$i, 'notification_status' => 'unread']);
    }

    $this->actingAs($user)->get(route('notifications.index'))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('notifications/index')
        ->has('notificationHistory.data', 20)
        ->where('notificationHistory.total', 25)
        ->where('counts.unread', 25)
        ->where('notificationHistory.data.0.user_id', $user->id));

    $this->get(route('notifications.index', ['page' => 2]))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('notificationHistory.data', 5)
        ->where('notificationHistory.current_page', 2));
})->with(['student', 'faculty', 'ict_admin']);

test('notification page filters read state without exposing other users counts', function () {
    $user = User::factory()->create();
    Notification::create(['user_id' => $user->id, 'message' => 'Read message', 'notification_status' => 'read']);
    Notification::create(['user_id' => $user->id, 'message' => 'Unread message', 'notification_status' => 'unread']);

    $this->actingAs($user)->get(route('notifications.index', ['status' => 'read']))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('counts.all', 2)->where('counts.unread', 1)
        ->where('notificationHistory.total', 1)
        ->where('notificationHistory.data.0.message', 'Read message'));
});

test('guests cannot browse notification history', function () {
    $this->get(route('notifications.index'))->assertRedirect(route('login'));
});

test('the unread count shared with the sidebar badge is not capped', function () {
    $role = Role::firstOrCreate(['role_name' => 'faculty']);
    $user = User::factory()->create(['role_id' => $role->id]);

    for ($i = 0; $i < 15; $i++) {
        Notification::create([
            'user_id' => $user->id,
            'message' => 'Unread notification '.$i,
            'notification_status' => 'unread',
        ]);
    }

    Notification::create([
        'user_id' => $user->id,
        'message' => 'Already read',
        'notification_status' => 'read',
    ]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('unreadNotificationsCount', 15)
            ->has('unreadNotifications', 10));
});

test('the unread count shared with the sidebar badge is zero for guests', function () {
    $this->get(route('login'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('unreadNotificationsCount', 0));
});

test('notifications are shared with a deep link for the bell', function () {
    $role = Role::firstOrCreate(['role_name' => 'faculty']);
    $user = User::factory()->create(['role_id' => $role->id]);

    Notification::create([
        'user_id' => $user->id,
        'message' => 'Your booking has been approved.',
        'notification_type' => 'booking',
        'link' => '/bookings/7',
        'notification_status' => 'unread',
    ]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('notifications.0.link', '/bookings/7'));
});

test('guests cannot mark a notification as read', function () {
    $user = User::factory()->create();
    $notification = Notification::create([
        'user_id' => $user->id,
        'message' => 'Test notification',
        'notification_status' => 'unread',
    ]);

    $this->post(route('notifications.read', $notification->id))
        ->assertRedirect(route('login'));
});

test('users can mark one notification as read', function () {
    $user = User::factory()->create();
    $notification = Notification::create([
        'user_id' => $user->id,
        'message' => 'Test notification',
        'notification_status' => 'unread',
    ]);

    $this->actingAs($user)
        ->post(route('notifications.read', $notification->id))
        ->assertRedirect();

    $this->assertDatabaseHas('notifications', [
        'id' => $notification->id,
        'notification_status' => 'read',
    ]);
});

test('users cannot mark another user notification as read', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $notification = Notification::create([
        'user_id' => $owner->id,
        'message' => 'Test notification',
        'notification_status' => 'unread',
    ]);

    $this->actingAs($otherUser)
        ->post(route('notifications.read', $notification->id))
        ->assertNotFound();

    $this->assertDatabaseHas('notifications', [
        'id' => $notification->id,
        'notification_status' => 'unread',
    ]);
});

test('users can mark all notifications as read', function () {
    $user = User::factory()->create();
    Notification::create([
        'user_id' => $user->id,
        'message' => 'First',
        'notification_status' => 'unread',
    ]);
    Notification::create([
        'user_id' => $user->id,
        'message' => 'Second',
        'notification_status' => 'unread',
    ]);

    $this->actingAs($user)
        ->post(route('notifications.read-all'))
        ->assertRedirect();

    $this->assertDatabaseMissing('notifications', [
        'user_id' => $user->id,
        'notification_status' => 'unread',
    ]);
});

test('users can delete their own notification', function () {
    $user = User::factory()->create();
    $notification = Notification::create([
        'user_id' => $user->id,
        'message' => 'Test notification',
    ]);

    $this->actingAs($user)
        ->delete(route('notifications.destroy', $notification->id))
        ->assertRedirect();

    $this->assertDatabaseMissing('notifications', [
        'id' => $notification->id,
    ]);
});

test('users cannot delete another user notification', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $notification = Notification::create([
        'user_id' => $owner->id,
        'message' => 'Test notification',
    ]);

    $this->actingAs($otherUser)
        ->delete(route('notifications.destroy', $notification->id))
        ->assertNotFound();

    $this->assertDatabaseHas('notifications', [
        'id' => $notification->id,
    ]);
});
