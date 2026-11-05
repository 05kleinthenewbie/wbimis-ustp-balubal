<?php

use App\Models\Notification;
use App\Models\Role;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

function mgmtUser(string $roleName, string $status = 'active'): User
{
    $role = Role::firstOrCreate(['role_name' => $roleName]);

    return User::factory()->create(['role_id' => $role->id, 'status' => $status]);
}

test('the user management page lists pending, active and deactivated users', function () {
    $admin = mgmtUser('ict_admin');
    mgmtUser('faculty_staff');
    mgmtUser('student', 'inactive');
    User::factory()->create(['status' => 'pending']);

    $this->actingAs($admin)
        ->get(route('users.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('users/index')
            ->has('pendingUsers', 1)
            ->has('activeUsers', 1)
            ->has('deactivatedUsers', 1));
});

test('admins can deactivate an active account', function () {
    $admin = mgmtUser('ict_admin');
    $user = mgmtUser('faculty_staff');

    $this->actingAs($admin)
        ->put(route('users.update', $user->id), ['status' => 'inactive'])
        ->assertRedirect();

    $this->assertDatabaseHas('users', ['id' => $user->id, 'status' => 'inactive']);

    expect(Notification::where('user_id', $user->id)->latest('id')->first()->message)
        ->toBe('Your account has been deactivated. Please contact the ICT office for more information.');
});

test('admins can reactivate a deactivated account', function () {
    $admin = mgmtUser('ict_admin');
    $user = mgmtUser('student', 'inactive');

    $this->actingAs($admin)
        ->put(route('users.update', $user->id), ['status' => 'active'])
        ->assertRedirect();

    $this->assertDatabaseHas('users', ['id' => $user->id, 'status' => 'active']);
});

test('admins can approve a pending account', function () {
    $admin = mgmtUser('ict_admin');
    $user = mgmtUser('faculty_staff', 'pending');

    $this->actingAs($admin)
        ->put(route('users.update', $user->id), ['status' => 'active'])
        ->assertRedirect();

    $this->assertDatabaseHas('users', ['id' => $user->id, 'status' => 'active']);
});

test('rejecting a pending registration removes it from the database', function () {
    $admin = mgmtUser('ict_admin');
    $user = mgmtUser('faculty_staff', 'pending');

    $this->actingAs($admin)
        ->put(route('users.update', $user->id), ['status' => 'inactive'])
        ->assertRedirect();

    $this->assertDatabaseMissing('users', ['id' => $user->id]);
    expect(User::where('email', $user->email)->exists())->toBeFalse();
});

test('rejected registrations are separate from deactivated accounts and must be reviewed again', function () {
    $admin = mgmtUser('ict_admin');
    $rejected = mgmtUser('faculty_staff', 'rejected');
    mgmtUser('faculty_staff', 'inactive');
    $this->actingAs($admin)->get(route('users.index'))
        ->assertInertia(fn (Assert $page) => $page->has('rejectedUsers', 1)->has('deactivatedUsers', 1));
    $this->put(route('users.update', $rejected), ['status' => 'active'])->assertSessionHasErrors('status');
    expect($rejected->refresh()->status)->toBe('rejected');
    $this->put(route('users.update', $rejected), ['status' => 'pending'])->assertRedirect();
    expect($rejected->refresh()->status)->toBe('pending');
});

test('rejected applicants cannot authenticate through web or API login', function () {
    $rejected = mgmtUser('faculty_staff', 'rejected');
    $this->post(route('login.store'), ['email' => $rejected->email, 'password' => 'password'])
        ->assertSessionHasErrors('email');
    $this->assertGuest();
    $this->postJson('/api/v1/auth/login', ['email' => $rejected->email, 'password' => 'password'])
        ->assertForbidden();
});

test('non-admins cannot manage user accounts', function () {
    $faculty = mgmtUser('faculty_staff');
    $target = mgmtUser('student');

    $this->actingAs($faculty)->get(route('users.index'))->assertForbidden();
    $this->actingAs($faculty)
        ->put(route('users.update', $target->id), ['status' => 'inactive'])
        ->assertForbidden();
});
