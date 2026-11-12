<?php

use App\Models\Booking;
use App\Models\Facility;
use App\Models\Role;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

function bookingPagesUser(string $roleName): User
{
    $role = Role::firstOrCreate(['role_name' => $roleName]);

    return User::factory()->create([
        'role_id' => $role->id,
        'status' => 'active',
    ]);
}

function bookingPagesFacility(string $name = 'Computer Laboratory A'): Facility
{
    return Facility::create([
        'facility_name' => $name,
        'facility_type' => 'computer_lab',
        'capacity' => 40,
        'location' => 'ICT Building',
        'availability_status' => 'available',
    ]);
}

function bookingPagesBooking(User $owner, Facility $facility, string $status, string $date = '2099-03-14'): Booking
{
    return Booking::create([
        'user_id' => $owner->id,
        'facility_id' => $facility->id,
        'booking_date' => $date,
        'start_time' => '08:00',
        'end_time' => '10:00',
        'purpose' => 'Lab session',
        'booking_status' => $status,
    ]);
}

test('admins can view the booking approvals queue', function () {
    $admin = bookingPagesUser('ict_admin');
    $faculty = bookingPagesUser('faculty');
    $facility = bookingPagesFacility();
    $pending = bookingPagesBooking($faculty, $facility, 'pending');
    bookingPagesBooking($faculty, $facility, 'approved', '2099-03-15');

    $this->actingAs($admin)
        ->get('/bookings/approvals')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('bookings/approvals')
            ->has('bookings', 1)
            ->where('bookings.0.id', $pending->id)
            ->where('stats.pending', 1)
            ->where('stats.approved', 1));
});

test('faculty and students cannot view the booking approvals queue', function () {
    $faculty = bookingPagesUser('faculty');
    $student = bookingPagesUser('student');

    $this->actingAs($faculty)->get('/bookings/approvals')->assertForbidden();
    $this->actingAs($student)->get('/bookings/approvals')->assertForbidden();
});

test('booking stats include completed bookings', function () {
    $admin = bookingPagesUser('ict_admin');
    $faculty = bookingPagesUser('faculty');
    $facility = bookingPagesFacility();
    bookingPagesBooking($faculty, $facility, 'completed', '2020-01-10');

    $this->actingAs($admin)
        ->get('/bookings')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('bookings/index')
            ->where('stats.completed', 1));
});

test('the complete past bookings command only completes past approved bookings', function () {
    $faculty = bookingPagesUser('faculty');
    $facility = bookingPagesFacility();
    $pastApproved = bookingPagesBooking($faculty, $facility, 'approved', '2020-01-10');
    $pastPending = bookingPagesBooking($faculty, $facility, 'pending', '2020-01-11');
    $futureApproved = Booking::create([
        'user_id' => $faculty->id,
        'facility_id' => $facility->id,
        'booking_date' => '2099-03-14',
        'start_time' => '08:00',
        'end_time' => '10:00',
        'purpose' => 'Future lab session',
        'booking_status' => 'approved',
    ]);

    $this->artisan('bookings:complete-past')->assertSuccessful();

    expect($pastApproved->fresh()->booking_status)->toBe('completed')
        ->and($pastPending->fresh()->booking_status)->toBe('pending')
        ->and($futureApproved->fresh()->booking_status)->toBe('approved');
});

test('admins can mark an approved booking as completed', function () {
    $admin = bookingPagesUser('ict_admin');
    $faculty = bookingPagesUser('faculty');
    $facility = bookingPagesFacility();
    $booking = bookingPagesBooking($faculty, $facility, 'approved');

    $this->actingAs($admin)
        ->put("/bookings/{$booking->id}", ['booking_status' => 'completed'])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($booking->fresh()->booking_status)->toBe('completed');
});

test('faculty cannot view another users booking', function () {
    $faculty = bookingPagesUser('faculty');
    $other = bookingPagesUser('faculty');
    $facility = bookingPagesFacility();
    $booking = bookingPagesBooking($other, $facility, 'approved');

    $this->actingAs($faculty)
        ->get("/bookings/{$booking->id}")
        ->assertForbidden();
});

test('admins can view any booking', function () {
    $admin = bookingPagesUser('ict_admin');
    $faculty = bookingPagesUser('faculty');
    $facility = bookingPagesFacility();
    $booking = bookingPagesBooking($faculty, $facility, 'approved');

    $this->actingAs($admin)
        ->get("/bookings/{$booking->id}")
        ->assertOk();
});

test('bookings that already ended are removed from the calendar', function () {
    $this->travelTo('2026-10-31 14:00:00');

    $faculty = bookingPagesUser('faculty');
    $facility = bookingPagesFacility();
    bookingPagesBooking($faculty, $facility, 'approved', '2026-10-30');
    Booking::create([
        'user_id' => $faculty->id,
        'facility_id' => $facility->id,
        'booking_date' => '2026-10-31',
        'start_time' => '08:00',
        'end_time' => '10:00',
        'booking_status' => 'approved',
    ]);
    $inProgress = Booking::create([
        'user_id' => $faculty->id,
        'facility_id' => $facility->id,
        'booking_date' => '2026-10-31',
        'start_time' => '13:00',
        'end_time' => '15:00',
        'booking_status' => 'approved',
    ]);
    $tomorrow = bookingPagesBooking($faculty, $facility, 'approved', '2026-11-01');

    $this->actingAs($faculty)
        ->get('/bookings')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('calendarBookings', 2)
            ->where('calendarBookings.0.id', $inProgress->id)
            ->where('calendarBookings.1.id', $tomorrow->id));
});

test('ended bookings do not block new bookings for the same slot', function () {
    $this->travelTo('2026-10-31 14:00:00');

    $faculty = bookingPagesUser('faculty');
    $facility = bookingPagesFacility();
    Booking::create([
        'user_id' => $faculty->id,
        'facility_id' => $facility->id,
        'booking_date' => '2026-10-31',
        'start_time' => '08:00',
        'end_time' => '10:00',
        'booking_status' => 'approved',
    ]);

    $this->actingAs($faculty)
        ->post('/bookings', [
            'facility_id' => $facility->id,
            'booking_date' => '2026-10-31',
            'start_time' => '08:00',
            'end_time' => '10:00',
            'purpose' => 'Retake session',
        ])
        ->assertRedirect('/bookings')
        ->assertSessionHasNoErrors();

    expect(Booking::where('purpose', 'Retake session')->exists())->toBeTrue();
});

test('the complete past command completes approved bookings that already ended today', function () {
    $this->travelTo('2026-10-31 14:00:00');

    $faculty = bookingPagesUser('faculty');
    $facility = bookingPagesFacility();
    $endedToday = Booking::create([
        'user_id' => $faculty->id,
        'facility_id' => $facility->id,
        'booking_date' => '2026-10-31',
        'start_time' => '08:00',
        'end_time' => '10:00',
        'booking_status' => 'approved',
    ]);
    $inProgress = Booking::create([
        'user_id' => $faculty->id,
        'facility_id' => $facility->id,
        'booking_date' => '2026-10-31',
        'start_time' => '13:00',
        'end_time' => '15:00',
        'booking_status' => 'approved',
    ]);

    $this->artisan('bookings:complete-past')->assertSuccessful();

    expect($endedToday->fresh()->booking_status)->toBe('completed')
        ->and($inProgress->fresh()->booking_status)->toBe('approved');
});
