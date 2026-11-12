<?php

use App\Models\IncidentReport;
use App\Models\InventoryItem;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

function incidentAdmin(): User
{
    $role = Role::firstOrCreate(['role_name' => 'ict_admin']);

    return User::factory()->create(['role_id' => $role->id]);
}

function incidentFaculty(): User
{
    $role = Role::firstOrCreate(['role_name' => 'faculty']);

    return User::factory()->create(['role_id' => $role->id]);
}

function makeIncident(User $reporter, array $overrides = []): IncidentReport
{
    return IncidentReport::create([
        'reported_by' => $reporter->id,
        'incident_type' => 'Equipment damage',
        'incident_description' => 'Monitor cracked during relocation.',
        'incident_date' => '2026-09-01',
        'status' => 'open',
        ...$overrides,
    ]);
}

test('guests are redirected to the login page from the incidents index', function () {
    $this->get(route('incidents.index'))->assertRedirect(route('login'));
});

test('admin sees all incidents on the index', function () {
    $admin = incidentAdmin();
    $faculty = incidentFaculty();

    makeIncident($faculty);
    makeIncident($admin, ['incident_type' => 'Theft or loss']);

    $response = $this->actingAs($admin)->get(route('incidents.index'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('incidents/index')
        ->has('incidents', 2)
        ->where('isAdmin', true),
    );
});

test('faculty only sees their own incidents on the index', function () {
    $faculty = incidentFaculty();
    $other = incidentFaculty();

    makeIncident($faculty, ['incident_description' => 'Mine']);
    makeIncident($other, ['incident_description' => 'Not mine']);

    $response = $this->actingAs($faculty)->get(route('incidents.index'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('incidents/index')
        ->has('incidents', 1)
        ->where('incidents.0.incident_description', 'Mine')
        ->where('isAdmin', false),
    );
});

test('users can store an incident report with an incident date', function () {
    $faculty = incidentFaculty();
    $item = InventoryItem::factory()->create();

    $response = $this->actingAs($faculty)->post(route('incidents.store'), [
        'item_id' => $item->id,
        'incident_type' => 'Unauthorized use',
        'incident_description' => 'Lab PC used after hours without approval.',
        'incident_date' => '2026-09-15',
    ]);

    $response->assertRedirect(route('incidents.index'));
    $response->assertSessionHas('status');

    $this->assertDatabaseHas('incident_reports', [
        'reported_by' => $faculty->id,
        'item_id' => $item->id,
        'incident_type' => 'Unauthorized use',
        'status' => 'open',
    ]);

    $incident = IncidentReport::query()->latest('id')->firstOrFail();

    expect($incident->incident_date->toDateString())->toBe('2026-09-15');
});

test('incident store validates required fields', function () {
    $faculty = incidentFaculty();

    $response = $this->actingAs($faculty)->post(route('incidents.store'), [
        'incident_type' => '',
        'incident_description' => '',
    ]);

    $response->assertSessionHasErrors([
        'incident_type',
        'incident_description',
        'incident_date',
    ]);
    $this->assertDatabaseCount('incident_reports', 0);
});

test('incidents without related equipment can still be reported', function () {
    $faculty = incidentFaculty();

    $this->actingAs($faculty)->post(route('incidents.store'), [
        'incident_type' => 'Safety concern',
        'incident_description' => 'Exposed cable near the laboratory entrance.',
        'incident_date' => '2026-09-15',
    ])->assertRedirect(route('incidents.index'))->assertSessionHasNoErrors();

    $incident = IncidentReport::where('reported_by', $faculty->id)->sole();

    expect($incident->item_id)->toBeNull();
});

test('non admins cannot update an incident', function () {
    $faculty = incidentFaculty();
    $incident = makeIncident($faculty);

    $this->actingAs($faculty)
        ->put(route('incidents.update', $incident), [
            'status' => 'resolved',
        ])
        ->assertForbidden();

    $this->assertDatabaseHas('incident_reports', [
        'id' => $incident->id,
        'status' => 'open',
    ]);
});

test('admin can update an incident status and assign liability', function () {
    $admin = incidentAdmin();
    $faculty = incidentFaculty();
    $liable = incidentFaculty();
    $incident = makeIncident($faculty);

    $response = $this->actingAs($admin)->put(route('incidents.update', $incident), [
        'status' => 'under_review',
        'liability_user_id' => $liable->id,
        'liability_description' => 'Admitted unauthorised use.',
        'liability_amount' => '1500.50',
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('status');

    $this->assertDatabaseHas('incident_reports', [
        'id' => $incident->id,
        'status' => 'under_review',
    ]);

    $this->assertDatabaseHas('user_liabilities', [
        'incident_id' => $incident->id,
        'user_id' => $liable->id,
        'liability_status' => 'pending',
        'liability_amount' => 1500.50,
    ]);
});

test('incident update validates the status value', function () {
    $admin = incidentAdmin();
    $incident = makeIncident(incidentFaculty());

    $response = $this->actingAs($admin)->put(route('incidents.update', $incident), [
        'status' => 'archived',
    ]);

    $response->assertSessionHasErrors('status');
});

test('admin can close an incident', function () {
    $admin = incidentAdmin();
    $incident = makeIncident(incidentFaculty());

    $this->actingAs($admin)
        ->put(route('incidents.update', $incident), [
            'status' => 'closed',
            'resolution_notes' => 'No further action required.',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $this->assertDatabaseHas('incident_reports', [
        'id' => $incident->id,
        'status' => 'closed',
    ]);
});

test('liability amount is optional when assigning a liability', function () {
    $admin = incidentAdmin();
    $liable = incidentFaculty();
    $incident = makeIncident(incidentFaculty());

    $this->actingAs($admin)
        ->put(route('incidents.update', $incident), [
            'status' => 'under_review',
            'liability_user_id' => $liable->id,
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $this->assertDatabaseHas('user_liabilities', [
        'incident_id' => $incident->id,
        'user_id' => $liable->id,
        'liability_status' => 'pending',
        'liability_amount' => null,
    ]);
});

test('faculty cannot view an incident reported by someone else', function () {
    $faculty = incidentFaculty();
    $incident = makeIncident(incidentFaculty());

    $this->actingAs($faculty)
        ->get(route('incidents.show', $incident))
        ->assertForbidden();
});

test('admins can view any incident', function () {
    $admin = incidentAdmin();
    $incident = makeIncident(incidentFaculty());

    $this->actingAs($admin)
        ->get(route('incidents.show', $incident))
        ->assertOk();
});

test('admin show page includes selectable users', function () {
    $admin = incidentAdmin();
    $faculty = incidentFaculty();
    $incident = makeIncident($faculty);

    $response = $this->actingAs($admin)->get(route('incidents.show', $incident));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('incidents/show')
        ->where('isAdmin', true)
        ->has('users')
        ->where('users', fn ($users) => $users->count() >= 2)
        ->where('incident.id', $incident->id),
    );
});

test('non admin show page has an empty users list', function () {
    $faculty = incidentFaculty();
    $incident = makeIncident($faculty);

    $response = $this->actingAs($faculty)->get(route('incidents.show', $incident));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('incidents/show')
        ->where('isAdmin', false)
        ->has('users', 0),
    );
});

test('create page lists inventory items', function () {
    $faculty = incidentFaculty();
    InventoryItem::factory()->create(['item_name' => 'DESKTOP COMPUTER']);

    $response = $this->actingAs($faculty)->get(route('incidents.create'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('incidents/create')
        ->has('inventoryItems', 1)
        ->where('inventoryItems.0.item_name', 'DESKTOP COMPUTER'),
    );
});

test('incident status changes must follow the review workflow', function () {
    $admin = incidentAdmin();
    $faculty = incidentFaculty();
    $incident = makeIncident($faculty);

    $this->actingAs($admin)
        ->put(route('incidents.update', $incident), ['status' => 'resolved', 'resolution_notes' => 'Fixed.'])
        ->assertSessionHasErrors('status');

    $this->actingAs($admin)
        ->put(route('incidents.update', $incident), ['status' => 'under_review'])
        ->assertSessionHasNoErrors();

    expect($incident->fresh()->status)->toBe('under_review');
});

test('resolving or closing an incident requires resolution notes', function () {
    $admin = incidentAdmin();
    $faculty = incidentFaculty();
    $incident = makeIncident($faculty, ['status' => 'under_review']);

    $this->actingAs($admin)
        ->put(route('incidents.update', $incident), ['status' => 'resolved'])
        ->assertSessionHasErrors('resolution_notes');

    $this->actingAs($admin)
        ->put(route('incidents.update', $incident), [
            'status' => 'resolved',
            'resolution_notes' => 'Replaced the cracked monitor.',
        ])
        ->assertSessionHasNoErrors();

    expect($incident->fresh()->resolution_notes)->toBe('Replaced the cracked monitor.');
});

test('an incident with pending liabilities cannot be closed', function () {
    $admin = incidentAdmin();
    $faculty = incidentFaculty();
    $incident = makeIncident($faculty, ['status' => 'under_review']);
    $incident->userLiabilities()->create([
        'user_id' => $faculty->id,
        'liability_description' => 'Cracked monitor',
        'liability_status' => 'pending',
        'date_assigned' => now(),
    ]);

    $this->actingAs($admin)
        ->put(route('incidents.update', $incident), [
            'status' => 'resolved',
            'resolution_notes' => 'Reviewed.',
        ])
        ->assertSessionHasErrors('status');
});

test('the reporter is notified when the incident status changes', function () {
    $admin = incidentAdmin();
    $faculty = incidentFaculty();
    $incident = makeIncident($faculty);

    $this->actingAs($admin)->put(route('incidents.update', $incident), [
        'status' => 'under_review',
    ])->assertSessionHasNoErrors();

    $this->assertDatabaseHas('notifications', [
        'user_id' => $faculty->id,
        'notification_type' => 'incident',
    ]);
});

test('assigning a liability notifies the liable user', function () {
    $admin = incidentAdmin();
    $faculty = incidentFaculty();
    $incident = makeIncident($faculty, ['status' => 'under_review']);

    $this->actingAs($admin)->put(route('incidents.update', $incident), [
        'status' => 'under_review',
        'liability_user_id' => $faculty->id,
        'liability_description' => 'Damaged monitor',
        'liability_amount' => '1500',
    ])->assertSessionHasNoErrors();

    $this->assertDatabaseHas('notifications', [
        'user_id' => $faculty->id,
        'notification_type' => 'liability',
    ]);
});

test('incident evidence files can be uploaded and downloaded privately', function () {
    Storage::fake('local');

    $admin = incidentAdmin();
    $faculty = incidentFaculty();
    $other = incidentFaculty();

    $item = InventoryItem::factory()->create();

    $this->actingAs($faculty)->post(route('incidents.store'), [
        'item_id' => $item->id,
        'incident_type' => 'Equipment damage',
        'incident_description' => 'Cracked monitor with photo evidence.',
        'incident_date' => '2026-09-15',
        'attachments' => [
            UploadedFile::fake()->create('damage.pdf', 100, 'application/pdf'),
        ],
    ])->assertRedirect(route('incidents.index'));

    $incident = IncidentReport::where('reported_by', $faculty->id)->sole();
    $attachment = $incident->attachments()->sole();

    Storage::disk('local')->assertExists($attachment->file_path);

    $this->actingAs($faculty)
        ->get(route('incidents.attachments.download', [$incident, $attachment]))
        ->assertOk();

    $this->actingAs($admin)
        ->get(route('incidents.attachments.download', [$incident, $attachment]))
        ->assertOk();

    $this->actingAs($other)
        ->get(route('incidents.attachments.download', [$incident, $attachment]))
        ->assertForbidden();
});
