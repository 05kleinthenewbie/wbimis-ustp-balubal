<?php

use App\Models\Facility;
use App\Models\Role;
use App\Models\User;

function bookingValidationUser(string $roleName): User
{
    $role = Role::firstOrCreate(['role_name' => $roleName]);

    return User::factory()->create([
        'role_id' => $role->id,
        'status' => 'active',
    ]);
}

function bookingValidationFacility(): Facility
{
    return Facility::create([
        'facility_name' => 'Computer Laboratory A',
        'facility_type' => 'computer_lab',
        'capacity' => 40,
        'location' => 'ICT Building',
        'availability_status' => 'available',
    ]);
}

test('faculty cannot book a facility on a sunday', function () {
    $faculty = bookingValidationUser('faculty');
    $facility = bookingValidationFacility();

    $this->actingAs($faculty)
        ->from('/bookings/create')
        ->post('/bookings', [
            'facility_id' => $facility->id,
            'booking_date' => '2099-03-15',
            'start_time' => '08:00',
            'end_time' => '10:00',
            'purpose' => 'Sunday session',
        ])
        ->assertRedirect('/bookings/create')
        ->assertSessionHasErrors('booking_date');

    $this->assertDatabaseCount('bookings', 0);
});

test('faculty can book a facility on a saturday', function () {
    $faculty = bookingValidationUser('faculty');
    $facility = bookingValidationFacility();

    $this->actingAs($faculty)
        ->post('/bookings', [
            'facility_id' => $facility->id,
            'booking_date' => '2099-03-14',
            'start_time' => '08:00',
            'end_time' => '10:00',
            'purpose' => 'Saturday session',
        ])
        ->assertRedirect('/bookings');

    $this->assertDatabaseHas('bookings', [
        'user_id' => $faculty->id,
        'facility_id' => $facility->id,
        'booking_date' => '2099-03-14 00:00:00',
        'booking_status' => 'pending',
    ]);
});

test('the api rejects facility bookings on a sunday', function () {
    $faculty = bookingValidationUser('faculty');
    $facility = bookingValidationFacility();
    $token = auth('api')->login($faculty);

    $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/bookings', [
            'facility_id' => $facility->id,
            'booking_date' => '2099-03-15',
            'start_time' => '08:00',
            'end_time' => '10:00',
            'purpose' => 'Sunday session',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('booking_date');

    $this->assertDatabaseCount('bookings', 0);
});
