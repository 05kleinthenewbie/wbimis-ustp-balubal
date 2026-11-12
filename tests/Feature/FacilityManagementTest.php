<?php

use App\Models\Booking;
use App\Models\Facility;
use App\Models\Role;
use App\Models\User;

function facilityUser(string $roleName): User
{
    $role = Role::firstOrCreate(['role_name' => $roleName]);

    return User::factory()->create([
        'role_id' => $role->id,
        'status' => 'active',
        'password' => bcrypt('secret'),
    ]);
}

function makeFacility(array $overrides = []): Facility
{
    return Facility::create(array_merge([
        'facility_name' => 'Computer Laboratory A',
        'facility_type' => 'computer_lab',
        'capacity' => 40,
        'location' => 'ICT Building',
        'availability_status' => 'available',
    ], $overrides));
}

function facilityPayload(array $overrides = []): array
{
    return array_merge([
        'facility_name' => 'AV Room 2',
        'facility_type' => 'av_room',
        'capacity' => 60,
        'location' => 'Main Building',
        'availability_status' => 'available',
    ], $overrides);
}

test('guests are redirected away from facility pages', function () {
    $this->get('/facilities')->assertRedirect('/login');
    $this->get('/facilities/create')->assertRedirect('/login');
    $this->post('/facilities', [])->assertRedirect('/login');
});

test('faculty cannot manage facilities', function () {
    $faculty = facilityUser('faculty');
    $facility = makeFacility();

    $this->actingAs($faculty)->get('/facilities')->assertForbidden();
    $this->actingAs($faculty)->get('/facilities/create')->assertForbidden();
    $this->actingAs($faculty)->post('/facilities', facilityPayload())->assertForbidden();
    $this->actingAs($faculty)->get("/facilities/{$facility->id}/edit")->assertForbidden();
    $this->actingAs($faculty)->put("/facilities/{$facility->id}", facilityPayload())->assertForbidden();
    $this->actingAs($faculty)->delete("/facilities/{$facility->id}")->assertForbidden();

    $this->assertDatabaseHas('facilities', ['facility_name' => $facility->facility_name]);
});

test('students cannot manage facilities', function () {
    $student = facilityUser('student');

    $this->actingAs($student)->get('/facilities')->assertForbidden();
    $this->actingAs($student)->post('/facilities', facilityPayload())->assertForbidden();
});

test('admins can view the facilities index and create form', function () {
    $admin = facilityUser('ict_admin');
    makeFacility();

    $this->actingAs($admin)->get('/facilities')->assertOk();
    $this->actingAs($admin)->get('/facilities/create')->assertOk();
});

test('admins can create facilities', function () {
    $admin = facilityUser('ict_admin');

    $response = $this->actingAs($admin)->post('/facilities', facilityPayload());

    $response->assertRedirect('/facilities');
    $response->assertSessionHas('status');

    $this->assertDatabaseHas('facilities', [
        'facility_name' => 'AV Room 2',
        'facility_type' => 'av_room',
    ]);

    $this->assertDatabaseHas('audit_logs', [
        'action_taken' => 'Created facility "AV Room 2"',
        'module_name' => 'facilities',
    ]);
});

test('creating a facility validates required fields', function () {
    $admin = facilityUser('ict_admin');

    $this->actingAs($admin)
        ->from('/facilities/create')
        ->post('/facilities', ['facility_name' => ''])
        ->assertRedirect('/facilities/create')
        ->assertSessionHasErrors(['facility_name', 'facility_type', 'availability_status']);
});

test('admins can update facilities', function () {
    $admin = facilityUser('ict_admin');
    $facility = makeFacility();

    $response = $this->actingAs($admin)->put("/facilities/{$facility->id}", facilityPayload([
        'facility_name' => 'Renamed Lab',
        'availability_status' => 'under_maintenance',
    ]));

    $response->assertRedirect('/facilities');

    $this->assertDatabaseHas('facilities', [
        'id' => $facility->id,
        'facility_name' => 'Renamed Lab',
        'availability_status' => 'under_maintenance',
    ]);

    $this->assertDatabaseHas('audit_logs', [
        'action_taken' => 'Updated facility "Renamed Lab"',
        'module_name' => 'facilities',
    ]);
});

test('admins can delete facilities without bookings', function () {
    $admin = facilityUser('ict_admin');
    $facility = makeFacility();

    $this->actingAs($admin)
        ->delete("/facilities/{$facility->id}")
        ->assertRedirect('/facilities');

    $this->assertDatabaseMissing('facilities', ['id' => $facility->id]);
});

test('facilities with bookings cannot be deleted', function () {
    $admin = facilityUser('ict_admin');
    $faculty = facilityUser('faculty');
    $facility = makeFacility();

    Booking::create([
        'user_id' => $faculty->id,
        'facility_id' => $facility->id,
        'booking_date' => '2099-06-01',
        'start_time' => '08:00',
        'end_time' => '10:00',
        'booking_status' => 'pending',
    ]);

    $this->actingAs($admin)
        ->delete("/facilities/{$facility->id}")
        ->assertRedirect();

    $this->assertDatabaseHas('facilities', ['id' => $facility->id]);
});
