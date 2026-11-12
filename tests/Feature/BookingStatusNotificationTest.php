<?php

use App\Mail\BookingStatusUpdated;
use App\Models\Booking;
use App\Models\Facility;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia as Assert;

function bookingRole(string $name): Role
{
    return Role::firstOrCreate(['role_name' => $name]);
}

function makeBooking(array $overrides = []): array
{
    $owner = User::factory()->create(['role_id' => bookingRole('faculty')->id]);
    $facility = Facility::create(['facility_name' => 'Computer Lab A']);

    $booking = Booking::create([
        'user_id' => $owner->id,
        'facility_id' => $facility->id,
        'booking_date' => '2099-03-14',
        'start_time' => '08:00',
        'end_time' => '10:00',
        'purpose' => 'Class orientation',
        'booking_status' => 'pending',
        ...$overrides,
    ]);

    return [$owner, $facility, $booking];
}

test('approving a booking notifies and emails the owner', function () {
    Mail::fake();

    $admin = User::factory()->create(['role_id' => bookingRole('ict_admin')->id]);
    [$owner, , $booking] = makeBooking();

    $this->actingAs($admin)
        ->put(route('bookings.update', $booking), ['booking_status' => 'approved'])
        ->assertRedirect();

    $this->assertDatabaseHas('bookings', [
        'id' => $booking->id,
        'booking_status' => 'approved',
        'approved_by' => $admin->id,
    ]);

    $this->assertDatabaseHas('notifications', [
        'user_id' => $owner->id,
        'notification_type' => 'booking',
        'link' => '/bookings/'.$booking->id,
        'notification_status' => 'unread',
    ]);

    Mail::assertQueued(BookingStatusUpdated::class, function (BookingStatusUpdated $mail) use ($owner, $booking) {
        return $mail->hasTo($owner->email)
            && $mail->hasSubject('Facility Booking #'.$booking->id.' Approved');
    });
});

test('rejecting a booking notifies and emails the owner', function () {
    Mail::fake();

    $admin = User::factory()->create(['role_id' => bookingRole('ict_admin')->id]);
    [$owner, , $booking] = makeBooking();

    $this->actingAs($admin)
        ->put(route('bookings.update', $booking), ['booking_status' => 'rejected'])
        ->assertRedirect();

    $this->assertDatabaseHas('bookings', [
        'id' => $booking->id,
        'booking_status' => 'rejected',
    ]);

    Mail::assertQueued(BookingStatusUpdated::class, function (BookingStatusUpdated $mail) use ($owner, $booking) {
        return $mail->hasTo($owner->email)
            && $mail->hasSubject('Facility Booking #'.$booking->id.' Rejected');
    });
});

test('re-saving the same decision does not resend the email', function () {
    Mail::fake();

    $admin = User::factory()->create(['role_id' => bookingRole('ict_admin')->id]);
    [, , $booking] = makeBooking(['booking_status' => 'approved']);

    $this->actingAs($admin)
        ->put(route('bookings.update', $booking), ['booking_status' => 'approved'])
        ->assertRedirect();

    Mail::assertNotQueued(BookingStatusUpdated::class);
});

test('non admins cannot approve or reject bookings', function () {
    Mail::fake();

    $faculty = User::factory()->create(['role_id' => bookingRole('faculty')->id]);
    [, , $booking] = makeBooking();

    $this->actingAs($faculty)
        ->put(route('bookings.update', $booking), ['booking_status' => 'approved'])
        ->assertForbidden();

    Mail::assertNotQueued(BookingStatusUpdated::class);
});

test('the booking owner can cancel their own pending booking and admins are notified', function () {
    Mail::fake();

    $admin = User::factory()->create(['role_id' => bookingRole('ict_admin')->id]);
    [$owner, , $booking] = makeBooking();

    $this->actingAs($owner)
        ->put(route('bookings.update', $booking), ['booking_status' => 'cancelled'])
        ->assertRedirect();

    $this->assertDatabaseHas('bookings', [
        'id' => $booking->id,
        'booking_status' => 'cancelled',
    ]);

    $this->assertDatabaseHas('notifications', [
        'user_id' => $admin->id,
        'notification_type' => 'booking',
        'notification_status' => 'unread',
    ]);

    Mail::assertNotQueued(BookingStatusUpdated::class);
});

test('an admin cancelling a booking notifies and emails the owner', function () {
    Mail::fake();

    $admin = User::factory()->create(['role_id' => bookingRole('ict_admin')->id]);
    [$owner, , $booking] = makeBooking(['booking_status' => 'approved']);

    $this->actingAs($admin)
        ->put(route('bookings.update', $booking), ['booking_status' => 'cancelled'])
        ->assertRedirect();

    $this->assertDatabaseHas('bookings', [
        'id' => $booking->id,
        'booking_status' => 'cancelled',
    ]);

    $this->assertDatabaseHas('notifications', [
        'user_id' => $owner->id,
        'notification_type' => 'booking',
        'link' => '/bookings/'.$booking->id,
        'notification_status' => 'unread',
    ]);

    Mail::assertQueued(BookingStatusUpdated::class, function (BookingStatusUpdated $mail) use ($owner, $booking) {
        return $mail->hasTo($owner->email)
            && $mail->hasSubject('Facility Booking #'.$booking->id.' Cancelled');
    });
});

test('booking status changes are recorded in the audit log', function () {
    Mail::fake();

    $admin = User::factory()->create(['role_id' => bookingRole('ict_admin')->id]);
    [, , $booking] = makeBooking();

    $this->actingAs($admin)
        ->put(route('bookings.update', $booking), ['booking_status' => 'approved'])
        ->assertRedirect();

    $this->assertDatabaseHas('audit_logs', [
        'action_taken' => 'Set booking status to approved',
        'module_name' => 'bookings',
        'record_id' => $booking->id,
    ]);
});

test('the booking owner cannot cancel someone else booking', function () {
    [, , $booking] = makeBooking();
    $other = User::factory()->create(['role_id' => bookingRole('faculty')->id]);

    $this->actingAs($other)
        ->put(route('bookings.update', $booking), ['booking_status' => 'cancelled'])
        ->assertForbidden();
});

test('the booking owner can cancel an approved booking even after its schedule', function () {
    Mail::fake();

    [$owner, , $booking] = makeBooking([
        'booking_date' => '2020-01-10',
        'booking_status' => 'approved',
    ]);

    $this->actingAs($owner)
        ->put(route('bookings.update', $booking), ['booking_status' => 'cancelled'])
        ->assertRedirect();

    $this->assertDatabaseHas('bookings', [
        'id' => $booking->id,
        'booking_status' => 'cancelled',
    ]);
});

test('the booking owner cannot cancel a rejected booking', function () {
    [$owner, , $booking] = makeBooking(['booking_status' => 'rejected']);

    $this->actingAs($owner)
        ->put(route('bookings.update', $booking), ['booking_status' => 'cancelled'])
        ->assertForbidden();
});

test('faculty can see other users bookings on the availability calendar', function () {
    [, $facility, $booking] = makeBooking();
    $faculty = User::factory()->create(['role_id' => bookingRole('faculty')->id]);

    $this->actingAs($faculty)
        ->get(route('bookings.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('bookings/index')
            ->has('calendarBookings', 1)
            ->where('calendarBookings.0.id', $booking->id)
            ->where('calendarBookings.0.facility_id', $facility->id)
            ->where('calendarBookings.0.facility_name', $facility->facility_name)
            ->where('calendarBookings.0.user_name', $booking->user->name)
            ->where('calendarBookings.0.booking_status', 'pending')
            ->has('facilities', 1)
        );
});

test('the create page lists other users bookings with requester names', function () {
    [, , $booking] = makeBooking();
    $faculty = User::factory()->create(['role_id' => bookingRole('faculty')->id]);

    $this->actingAs($faculty)
        ->get(route('bookings.create'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('bookings/create')
            ->has('upcomingBookings', 1)
            ->where('upcomingBookings.0.id', $booking->id)
            ->where('upcomingBookings.0.user_name', $booking->user->name)
        );
});
