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

test('the user management page lists active and deactivated users', function () {
    $admin = mgmtUser('ict_admin');
    mgmtUser('faculty_staff');
    mgmtUser('student', 'inactive');

    $this->actingAs($admin)
        ->get(route('users.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('users/index')
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
    fakeBrevoMail();
    $admin = mgmtUser('ict_admin');
    $user = mgmtUser('student', 'inactive');

    $this->actingAs($admin)
        ->put(route('users.update', $user->id), ['status' => 'active'])
        ->assertRedirect();

    $this->assertDatabaseHas('users', ['id' => $user->id, 'status' => 'active']);
});

test('non-admins cannot manage user accounts', function () {
    $faculty = mgmtUser('faculty_staff');
    $target = mgmtUser('student');

    $this->actingAs($faculty)->get(route('users.index'))->assertForbidden();
    $this->actingAs($faculty)
        ->put(route('users.update', $target->id), ['status' => 'inactive'])
        ->assertForbidden();
});
