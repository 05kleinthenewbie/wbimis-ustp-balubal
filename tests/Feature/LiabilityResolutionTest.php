<?php

use App\Models\IncidentReport;
use App\Models\Role;
use App\Models\User;
use App\Models\UserLiability;

function liabilityAdmin(): User
{
    $role = Role::firstOrCreate(['role_name' => 'ict_admin']);

    return User::factory()->create(['role_id' => $role->id]);
}

function liabilityFaculty(): User
{
    $role = Role::firstOrCreate(['role_name' => 'faculty']);

    return User::factory()->create(['role_id' => $role->id]);
}

function makeIncidentWithLiability(): array
{
    $reporter = liabilityFaculty();
    $liable = liabilityFaculty();

    $incident = IncidentReport::create([
        'reported_by' => $reporter->id,
        'incident_type' => 'Equipment damage',
        'incident_description' => 'Monitor cracked during relocation.',
        'status' => 'under_review',
    ]);

    $liability = UserLiability::create([
        'incident_id' => $incident->id,
        'user_id' => $liable->id,
        'liability_description' => 'Admitted unauthorised use.',
        'liability_status' => 'pending',
        'date_assigned' => now(),
    ]);

    return [$incident, $liability];
}

test('admin can settle a liability', function () {
    $admin = liabilityAdmin();
    [$incident, $liability] = makeIncidentWithLiability();

    $response = $this->actingAs($admin)->post(
        route('incidents.liabilities.resolve', [$incident->id, $liability->id]),
        ['liability_status' => 'settled'],
    );

    $response->assertRedirect();
    $response->assertSessionHas('status');

    $this->assertDatabaseHas('user_liabilities', [
        'id' => $liability->id,
        'liability_status' => 'settled',
    ]);

    expect(UserLiability::findOrFail($liability->id)->date_settled)->not->toBeNull();
});

test('admin can waive a liability', function () {
    $admin = liabilityAdmin();
    [$incident, $liability] = makeIncidentWithLiability();

    $this->actingAs($admin)->post(
        route('incidents.liabilities.resolve', [$incident->id, $liability->id]),
        ['liability_status' => 'waived'],
    )->assertRedirect();

    $this->assertDatabaseHas('user_liabilities', [
        'id' => $liability->id,
        'liability_status' => 'waived',
    ]);
});

test('non admins cannot resolve liabilities', function () {
    $faculty = liabilityFaculty();
    [$incident, $liability] = makeIncidentWithLiability();

    $this->actingAs($faculty)->post(
        route('incidents.liabilities.resolve', [$incident->id, $liability->id]),
        ['liability_status' => 'settled'],
    )->assertForbidden();

    $this->assertDatabaseHas('user_liabilities', [
        'id' => $liability->id,
        'liability_status' => 'pending',
    ]);
});

test('liability resolution rejects unknown statuses', function () {
    $admin = liabilityAdmin();
    [$incident, $liability] = makeIncidentWithLiability();

    $response = $this->actingAs($admin)->post(
        route('incidents.liabilities.resolve', [$incident->id, $liability->id]),
        ['liability_status' => 'dismissed'],
    );

    $response->assertSessionHasErrors('liability_status');
});

test('a liability can only be resolved through its own incident', function () {
    $admin = liabilityAdmin();
    [$otherIncident] = makeIncidentWithLiability();
    [$incident, $liability] = makeIncidentWithLiability();

    $this->actingAs($admin)->post(
        route('incidents.liabilities.resolve', [$otherIncident->id, $liability->id]),
        ['liability_status' => 'settled'],
    )->assertNotFound();
});
