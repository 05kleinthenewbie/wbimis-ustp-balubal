<?php

use App\Mail\LiabilityUpdated;
use App\Models\IncidentReport;
use App\Models\Notification;
use App\Models\Role;
use App\Models\User;
use App\Models\UserLiability;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Mail::fake();
});

test('assigning liability notifies the liable user and they can view it even when someone else reported the incident', function (string $roleName) {
    $admin = User::factory()->create(['role_id' => Role::firstOrCreate(['role_name' => 'ict_admin'])->id]);
    $liable = User::factory()->create(['role_id' => Role::firstOrCreate(['role_name' => $roleName])->id]);
    $incident = IncidentReport::create(['reported_by' => $admin->id, 'incident_type' => 'Equipment damage', 'incident_description' => 'Damaged monitor', 'status' => 'open']);

    $this->actingAs($admin)->put(route('incidents.update', $incident), [
        'status' => 'under_review', 'liability_user_id' => $liable->id,
        'liability_description' => 'Monitor replacement', 'liability_amount' => '1500.00',
    ])->assertRedirect();
    $liability = UserLiability::where('user_id', $liable->id)->firstOrFail();
    $this->assertDatabaseHas('notifications', [
        'user_id' => $liable->id, 'notification_type' => 'liability',
        'link' => route('liabilities.index', ['liability' => $liability->id], false),
    ]);
    Mail::assertQueued(LiabilityUpdated::class, fn ($mail) => $mail->hasTo($liable->email) && $mail->liabilityId === $liability->id);
    $this->actingAs($liable)->get(route('liabilities.index'))
        ->assertInertia(fn (Assert $page) => $page->component('liabilities/index')
            ->has('liabilities.data', 1)
            ->where('liabilities.data.0.liability_amount', '1500.00')
            ->where('liabilities.data.0.incident_report.incident_type', 'Equipment damage')
            ->missing('liabilities.data.0.incident_report.incident_description'));
    $this->get(route('incidents.show', $incident))->assertForbidden();

    $this->post(route('liabilities.acknowledge', $liability), ['liability_status' => 'settled'])->assertRedirect();
    expect($liability->fresh()->acknowledged_at)->not->toBeNull()
        ->and($liability->fresh()->liability_status)->toBe('pending');
    expect(Notification::where('user_id', $admin->id)->where('notification_type', 'liability')->count())->toBe(1);
    $acknowledgedAt = $liability->fresh()->acknowledged_at;
    $this->post(route('liabilities.acknowledge', $liability))->assertRedirect();
    expect($liability->fresh()->acknowledged_at->equalTo($acknowledgedAt))->toBeTrue();
    expect(Notification::where('user_id', $admin->id)->where('notification_type', 'liability')->count())->toBe(1);
})->with(['student', 'faculty']);

test('liability can be assigned without an amount', function () {
    $admin = User::factory()->create(['role_id' => Role::firstOrCreate(['role_name' => 'ict_admin'])->id]);
    $liable = User::factory()->create();
    $incident = IncidentReport::create(['reported_by' => $admin->id, 'incident_type' => 'Equipment damage', 'incident_description' => 'Monitor', 'status' => 'open']);

    $this->actingAs($admin)
        ->put(route('incidents.update', $incident), [
            'status' => 'under_review',
            'liability_user_id' => (string) $liable->id,
            'liability_description' => 'Monitor replacement',
            'liability_amount' => null,
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $liability = UserLiability::where('user_id', $liable->id)->firstOrFail();
    expect($liability->liability_amount)->toBeNull()
        ->and($liability->liability_status)->toBe('pending');
});

test('assignment rejects an invalid amount', function (string $amount, string $errorKey) {
    $admin = User::factory()->create(['role_id' => Role::firstOrCreate(['role_name' => 'ict_admin'])->id]);
    $liable = User::factory()->create();
    $incident = IncidentReport::create(['reported_by' => $admin->id, 'incident_type' => 'Equipment damage', 'incident_description' => 'Monitor', 'status' => 'open']);

    $this->actingAs($admin)
        ->put(route('incidents.update', $incident), [
            'status' => 'under_review',
            'liability_user_id' => (string) $liable->id,
            'liability_description' => 'Monitor replacement',
            'liability_amount' => $amount,
        ])
        ->assertSessionHasErrors($errorKey);

    expect(UserLiability::count())->toBe(0);
    expect($incident->fresh()->status)->toBe('open');
})->with([
    'non numeric amount' => ['1,500.00', 'liability_amount'],
    'negative amount' => ['-1', 'liability_amount'],
]);

test('users cannot view or acknowledge another persons liability', function () {
    $owner = User::factory()->create();
    $other = User::factory()->create();
    $incident = IncidentReport::create(['reported_by' => $owner->id, 'incident_type' => 'Equipment damage', 'incident_description' => 'Private', 'status' => 'open']);
    $liability = $incident->userLiabilities()->create(['user_id' => $owner->id, 'liability_status' => 'pending']);

    $this->actingAs($other)->get(route('liabilities.index', ['liability' => $liability->id]))
        ->assertInertia(fn (Assert $page) => $page->has('liabilities.data', 0));
    $this->post(route('liabilities.acknowledge', $liability))->assertNotFound();
    expect($liability->fresh()->acknowledged_at)->toBeNull();
});

test('settlement updates notify the liable user and cannot be acknowledged afterwards', function (string $status) {
    $admin = User::factory()->create(['role_id' => Role::firstOrCreate(['role_name' => 'ict_admin'])->id]);
    $owner = User::factory()->create();
    $incident = IncidentReport::create(['reported_by' => $admin->id, 'incident_type' => 'Equipment damage', 'incident_description' => 'Monitor', 'status' => 'open']);
    $liability = $incident->userLiabilities()->create(['user_id' => $owner->id, 'liability_status' => 'pending']);

    $this->actingAs($admin)->post(route('incidents.liabilities.resolve', [$incident, $liability]), ['liability_status' => $status])->assertRedirect();
    $this->assertDatabaseHas('notifications', ['user_id' => $owner->id, 'message' => 'Your liability #'.$liability->id.' has been marked '.$status.'.']);
    Mail::assertQueued(LiabilityUpdated::class, 2);
    $this->actingAs($owner)->post(route('liabilities.acknowledge', $liability))->assertUnprocessable();
})->with(['settled', 'waived']);

test('guests cannot manage liabilities', function () {
    $this->get(route('liabilities.index'))->assertRedirect(route('login'));
    $this->post(route('liabilities.acknowledge', 1))->assertRedirect(route('login'));
});

test('liability email renders a link to the personal liability record', function () {
    $mail = new LiabilityUpdated('Juan', 'Assigned liability', 'Damaged monitor', '100.00', 7);
    expect($mail->render())->toContain('Damaged monitor', '100.00', 'liabilities?liability=7');
});
