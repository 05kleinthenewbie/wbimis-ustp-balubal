<?php

use App\Models\Facility;
use App\Models\IncidentReport;
use App\Models\InventoryItem;
use App\Models\Role;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

function accessUser(string $roleName): User
{
    $role = Role::firstOrCreate(['role_name' => $roleName]);

    return User::factory()->create([
        'role_id' => $role->id,
        'status' => 'active',
        'password' => bcrypt('secret'),
    ]);
}

test('students are blocked from the facility booking pages', function () {
    $student = accessUser('student');

    $this->actingAs($student)->get(route('bookings.index'))->assertForbidden();
    $this->actingAs($student)->get(route('bookings.create'))->assertForbidden();
    $this->actingAs($student)->post(route('bookings.store'), [])->assertForbidden();
    $this->actingAs($student)->get(route('bookings.show', 999))->assertForbidden();
    $this->actingAs($student)->put(route('bookings.update', 999), [
        'booking_status' => 'cancelled',
    ])->assertForbidden();
});

test('students can submit and view only their own laboratory incidents', function () {
    $student = accessUser('student');
    $otherStudent = accessUser('student');
    $otherIncident = IncidentReport::create([
        'reported_by' => $otherStudent->id,
        'incident_type' => 'Theft or loss',
        'incident_description' => 'Other student report',
        'status' => 'open',
    ]);

    $item = InventoryItem::factory()->create();

    $this->actingAs($student)->get(route('incidents.create'))->assertOk();
    $this->post(route('incidents.store'), [
        'item_id' => $item->id,
        'incident_date' => '2026-09-15',
        'incident_type' => 'Equipment damage',
        'incident_description' => 'Broken keyboard in the laboratory',
        'reported_by' => $otherStudent->id,
        'status' => 'closed',
    ])->assertRedirect(route('incidents.index'));

    $incident = IncidentReport::where('reported_by', $student->id)->firstOrFail();
    expect($incident->status)->toBe('open');
    $this->get(route('incidents.index'))->assertInertia(fn (Assert $page) => $page
        ->has('incidents', 1)->where('incidents.0.id', $incident->id)->where('isAdmin', false));
    $this->get(route('incidents.show', $incident))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('isAdmin', false)->has('users', 0));
    $this->get(route('incidents.show', $otherIncident))->assertForbidden();
    $this->put(route('incidents.update', $incident), ['status' => 'closed'])->assertForbidden();
    $liability = $incident->userLiabilities()->create([
        'user_id' => $student->id,
        'liability_description' => 'Keyboard damage',
        'liability_status' => 'pending',
        'date_assigned' => now(),
    ]);
    $this->post(route('incidents.liabilities.resolve', [$incident, $liability]), ['liability_status' => 'waived'])->assertForbidden();
    expect($incident->fresh()->status)->toBe('open');
    expect($liability->fresh()->liability_status)->toBe('pending');
});

test('students are blocked from booking api endpoints', function () {
    $token = auth('api')->login(accessUser('student'));

    $this->withHeader('Authorization', 'Bearer '.$token)
        ->getJson('/api/v1/bookings')
        ->assertForbidden();
    $this->withHeader('Authorization', 'Bearer '.$token)
        ->postJson('/api/v1/bookings', [])
        ->assertForbidden();
    $this->withHeader('Authorization', 'Bearer '.$token)
        ->getJson('/api/v1/facilities')
        ->assertForbidden();
});

test('students can report incidents through the api without accessing others or reviewing reports', function () {
    $student = accessUser('student');
    $other = accessUser('faculty');
    $otherIncident = IncidentReport::create([
        'reported_by' => $other->id,
        'incident_type' => 'Equipment damage',
        'incident_description' => 'Private report',
        'status' => 'open',
    ]);
    $token = auth('api')->login($student);
    $this->withHeader('Authorization', 'Bearer '.$token);
    $response = $this->postJson('/api/v1/incidents', [
        'incident_type' => 'Safety concern',
        'incident_description' => 'Exposed cable in the lab',
        'reported_by' => $other->id,
        'status' => 'resolved',
    ])->assertCreated()->assertJsonPath('incident.reported_by', $student->id)->assertJsonPath('incident.status', 'open');
    $id = $response->json('incident.id');
    $this->getJson('/api/v1/incidents')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $id);
    $this->getJson('/api/v1/incidents/'.$id)->assertOk();
    $this->getJson('/api/v1/incidents/'.$otherIncident->id)->assertForbidden();
    $this->putJson('/api/v1/incidents/'.$id, ['status' => 'resolved'])->assertForbidden();
});

test('faculty still access booking and incident pages', function () {
    $faculty = accessUser('faculty');

    $this->actingAs($faculty)->get(route('bookings.create'))->assertOk();
    $this->actingAs($faculty)->get(route('incidents.create'))->assertOk();
});

test('admins still access booking and incident indexes', function () {
    $admin = accessUser('ict_admin');
    $faculty = accessUser('faculty');

    IncidentReport::create([
        'reported_by' => $faculty->id,
        'incident_type' => 'Equipment damage',
        'incident_description' => 'Monitor cracked during relocation.',
        'incident_date' => '2026-09-01',
        'status' => 'open',
    ]);

    $this->actingAs($admin)->get(route('bookings.index'))->assertOk();
    $this->actingAs($admin)->get(route('incidents.index'))->assertOk();
});

test('admins can view the facility booking create form', function () {
    $admin = accessUser('ict_admin');

    $this->actingAs($admin)->get(route('bookings.create'))->assertOk();
});

test('admins can submit facility bookings', function () {
    $admin = accessUser('ict_admin');
    $facility = Facility::create([
        'facility_name' => 'Computer Laboratory A',
        'facility_type' => 'computer_lab',
        'capacity' => 40,
        'location' => 'Balubal Campus',
        'availability_status' => 'available',
    ]);

    $response = $this->actingAs($admin)->post(route('bookings.store'), [
        'facility_id' => $facility->id,
        'booking_date' => now()->next('Monday')->toDateString(),
        'start_time' => '09:00',
        'end_time' => '11:00',
        'purpose' => 'ICT staff training',
    ]);

    $response->assertRedirect(route('bookings.index'));
    $response->assertSessionHas('status');

    $this->assertDatabaseHas('bookings', [
        'user_id' => $admin->id,
        'facility_id' => $facility->id,
        'booking_status' => 'pending',
    ]);
});
