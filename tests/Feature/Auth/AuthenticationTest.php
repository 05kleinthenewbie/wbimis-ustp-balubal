<?php

use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\RateLimiter;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Fortify\Features;

function loginUserWithRole(string $roleName): User
{
    $role = Role::firstOrCreate(['role_name' => $roleName]);

    return User::factory()->create(['role_id' => $role->id]);
}

test('login portal screen can be rendered', function () {
    $response = $this->get(route('login'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page->component('auth/login-portal'));
});

test('administrator login screen can be rendered', function () {
    $response = $this->get(route('admin.login'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('auth/login')
        ->where('canResetPassword', true));
});

test('faculty login screen can be rendered', function () {
    $response = $this->get(route('faculty.login'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('auth/faculty-login')
        ->where('canResetPassword', true));
});

test('users can authenticate using the login screen', function () {
    $user = User::factory()->create();

    $response = $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard'));
});

test('users with two factor enabled are redirected to two factor challenge', function () {
    if (! Features::canManageTwoFactorAuthentication()) {
        $this->markTestSkipped('Two-factor authentication is not enabled.');
    }

    Features::twoFactorAuthentication([
        'confirm' => true,
        'confirmPassword' => true,
    ]);

    $user = User::factory()->withTwoFactor()->create();

    $response = $this->post(route('login'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $response->assertRedirect(route('two-factor.login'));
    $response->assertSessionHas('login.id', $user->id);
    $this->assertGuest();
});

test('users can not authenticate with invalid password', function () {
    $user = User::factory()->create();

    $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'wrong-password',
    ]);

    $this->assertGuest();
});

test('the administrator login form rejects faculty credentials', function () {
    $faculty = loginUserWithRole('faculty');

    $response = $this->post(route('login.store'), [
        'email' => $faculty->email,
        'password' => 'password',
        'portal' => 'admin',
    ]);

    $this->assertGuest();
    $response->assertSessionHasErrors([
        'email' => 'This sign-in form is for ICT administrators only. Faculty should use the Faculty sign-in page.',
    ]);
});

test('the faculty login form rejects administrator credentials', function () {
    $admin = loginUserWithRole('ict_admin');

    $response = $this->post(route('login.store'), [
        'email' => $admin->email,
        'password' => 'password',
        'portal' => 'faculty',
    ]);

    $this->assertGuest();
    $response->assertSessionHasErrors([
        'email' => 'This sign-in form is for faculty only. Administrators should use the Administrator sign-in page.',
    ]);
});

test('each portal accepts credentials that match its role', function () {
    $admin = loginUserWithRole('ict_admin');
    $faculty = loginUserWithRole('faculty');

    $this->post(route('login.store'), [
        'email' => $admin->email,
        'password' => 'password',
        'portal' => 'admin',
    ])->assertRedirect(route('dashboard'));

    $this->assertAuthenticatedAs($admin);
    $this->post(route('logout'));

    $this->post(route('login.store'), [
        'email' => $faculty->email,
        'password' => 'password',
        'portal' => 'faculty',
    ])->assertRedirect(route('dashboard'));

    $this->assertAuthenticatedAs($faculty);
});

test('pending users can not authenticate', function () {
    $user = User::factory()->create(['status' => 'pending']);

    $response = $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertGuest();
    $response->assertSessionHasErrors([
        'email' => 'Your account is pending ICT Admin approval. You will be able to log in once approved.',
    ]);
});

test('inactive users can not authenticate', function () {
    $user = User::factory()->create(['status' => 'inactive']);

    $response = $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertGuest();
    $response->assertSessionHasErrors([
        'email' => 'Your account has been deactivated. Please contact the ICT office.',
    ]);
});

test('users can logout', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('logout'));

    $this->assertGuest();
    $response->assertRedirect(route('home'));
});

test('users are rate limited', function () {
    $user = User::factory()->create();

    RateLimiter::increment(md5('login'.implode('|', [$user->email, '127.0.0.1'])), amount: 5);

    $response = $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'wrong-password',
    ]);

    $response->assertTooManyRequests();
});
