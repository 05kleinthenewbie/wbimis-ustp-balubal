<?php

use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

function studentResetUser(array $overrides = []): User
{
    $role = Role::firstOrCreate(['role_name' => 'student']);

    return User::factory()->create(array_merge([
        'role_id' => $role->id,
        'id_number' => '2023303709',
        'email' => 'student.reset@gmail.com',
        'password' => '2023303709',
        'status' => 'active',
    ], $overrides));
}

test('the student forgot password form can be rendered', function () {
    $this->get(route('student.password.request'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('auth/student-forgot-password'));
});

test('a password reset link is emailed to the gmail on file', function () {
    fakeBrevoMail();

    studentResetUser();

    $this->post(route('student.password.email'), ['email' => 'student.reset@gmail.com'])
        ->assertSessionHas('status', 'Please check your email for the reset details.');

    Http::assertSent(function (Request $request) {
        return $request->url() === 'https://api.brevo.com/v3/smtp/email'
            && $request['to'][0]['email'] === 'student.reset@gmail.com'
            && str_contains($request['subject'], 'Reset your');
    });

    expect(passwordResetToken())->not->toBe('');
});

test('unknown student emails receive the same response without an email', function () {
    fakeBrevoMail();

    $this->post(route('student.password.email'), ['email' => 'unknown@gmail.com'])
        ->assertSessionHas('status', 'Please check your email for the reset details.');

    Http::assertNothingSent();
});

test('the student form does not issue links for non student accounts', function () {
    fakeBrevoMail();

    $role = Role::firstOrCreate(['role_name' => 'faculty']);
    User::factory()->create([
        'role_id' => $role->id,
        'email' => 'faculty.reset@gmail.com',
    ]);

    $this->post(route('student.password.email'), ['email' => 'faculty.reset@gmail.com'])
        ->assertSessionHas('status', 'Please check your email for the reset details.');

    Http::assertNothingSent();
});

test('students can set a new password with the emailed reset link', function () {
    fakeBrevoMail();

    studentResetUser();

    $this->post(route('student.password.email'), ['email' => 'student.reset@gmail.com']);

    $this->get(passwordResetUrl())->assertOk();

    $this->post(route('password.update'), [
        'token' => passwordResetToken(),
        'email' => 'student.reset@gmail.com',
        'password' => 'BrandNewPass123',
        'password_confirmation' => 'BrandNewPass123',
    ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('login'));

    $this->post(route('student.authenticate'), [
        'email' => 'student.reset@gmail.com',
        'password' => 'BrandNewPass123',
    ])->assertRedirect(route('dashboard'));
});

test('the student reset form requires a valid email address', function () {
    $this->post(route('student.password.email'), ['email' => 'not-an-email'])
        ->assertSessionHasErrors('email');
});
