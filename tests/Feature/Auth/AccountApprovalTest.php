<?php

use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->adminRole = Role::firstOrCreate(['role_name' => 'ict_admin'], ['description' => 'ICT admins']);
    $this->facultyRole = Role::firstOrCreate(['role_name' => 'faculty_staff'], ['description' => 'Faculty and staff']);
    $this->admin = User::factory()->create(['role_id' => $this->adminRole->id]);
});

test('an approved user can access the dashboard', function () {
    $this->actingAs(User::factory()->create(['role_id' => $this->facultyRole->id]))
        ->get(route('dashboard'))
        ->assertOk();
});

test('unapproved users are redirected from protected pages to the pending notice', function () {
    $user = User::factory()->pendingApproval()->create(['role_id' => $this->facultyRole->id]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertRedirect(route('approval.pending'));
});

test('unapproved users can view the pending approval notice', function () {
    $user = User::factory()->pendingApproval()->create(['role_id' => $this->facultyRole->id]);

    $this->actingAs($user)
        ->get(route('approval.pending'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('approval-pending'));
});

test('administrators are never gated by pending approval', function () {
    $this->admin->update(['is_approved' => false]);

    $this->actingAs($this->admin->refresh())
        ->get(route('dashboard'))
        ->assertOk();
});

test('the approvals panel lists verified unapproved accounts', function () {
    $pending = User::factory()->pendingApproval()->create(['role_id' => $this->facultyRole->id]);
    $unverified = User::factory()->pendingApproval()->unverified()->create(['role_id' => $this->facultyRole->id]);

    $this->actingAs($this->admin)
        ->get(route('users.approvals'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('users/approvals')
            ->where('pendingUsers', function ($users) use ($pending, $unverified) {
                return count($users) === 1
                    && $users[0]['id'] === $pending->id
                    && ! collect($users)->contains('id', $unverified->id);
            }));
});

test('approval requires a verified email address', function () {
    $user = User::factory()->pendingApproval()->unverified()->create(['role_id' => $this->facultyRole->id]);
    Notification::fake();

    $this->actingAs($this->admin)
        ->patch(route('users.approve', $user->id))
        ->assertSessionHasErrors('approve');

    expect($user->fresh()->is_approved)->toBeFalse();
});

test('an administrator can approve a pending account', function () {
    Notification::fake();
    $user = User::factory()->pendingApproval()->create(['role_id' => $this->facultyRole->id]);

    $this->actingAs($this->admin)
        ->patch(route('users.approve', $user->id))
        ->assertRedirect(route('users.approvals'))
        ->assertSessionHas('status', $user->name."'s account has been approved.");

    expect($user->fresh()->is_approved)->toBeTrue()
        ->and($user->fresh()->status)->toBe('active');

    $this->assertDatabaseHas('notifications', [
        'user_id' => $user->id,
        'notification_type' => 'account_approval',
    ]);
    $this->assertDatabaseHas('audit_logs', [
        'record_id' => $user->id,
        'action_taken' => 'Approved the account registration',
    ]);

    $this->actingAs($user->refresh())->get(route('dashboard'))->assertOk();
});

test('only administrators can approve or revoke accounts', function () {
    $user = User::factory()->pendingApproval()->create(['role_id' => $this->facultyRole->id]);
    $nonAdmin = User::factory()->create(['role_id' => $this->facultyRole->id]);

    $this->actingAs($nonAdmin)
        ->patch(route('users.approve', $user->id))
        ->assertForbidden();

    $this->actingAs($nonAdmin)
        ->patch(route('users.revoke-approval', $user->id))
        ->assertForbidden();

    $this->patch(route('users.approve', $user->id))->assertForbidden();

    expect($user->fresh()->is_approved)->toBeFalse();
});

test('approvals can be revoked and running sessions lose access immediately', function () {
    $user = User::factory()->create(['role_id' => $this->facultyRole->id]);

    $this->actingAs($user)->get(route('dashboard'))->assertOk();

    $this->actingAs($this->admin)
        ->patch(route('users.revoke-approval', $user->id))
        ->assertRedirect(route('users.approvals'))
        ->assertSessionHas('status');

    expect($user->fresh()->is_approved)->toBeFalse();

    $this->actingAs($user->refresh())
        ->get(route('dashboard'))
        ->assertRedirect(route('approval.pending'));
});

test('administrator approvals cannot be revoked', function () {
    $this->actingAs($this->admin)
        ->patch(route('users.revoke-approval', $this->admin->id))
        ->assertSessionHasErrors('revoke');

    expect($this->admin->fresh()->is_approved)->toBeTrue();
});

test('the factory produces unapproved accounts only for the pendingApproval state', function () {
    $pending = User::factory()->pendingApproval()->create();
    $regular = User::factory()->create();

    expect($pending->is_approved)->toBeFalse()
        ->and($regular->is_approved)->toBeTrue();
});

test('unapproved accounts cannot use protected api endpoints', function () {
    $user = User::factory()->pendingApproval()->create(['role_id' => $this->facultyRole->id]);
    $token = auth('api')->login($user);

    $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/v1/dashboard')
        ->assertForbidden()
        ->assertJsonPath('message', 'Your account is pending administrator approval.');
});
