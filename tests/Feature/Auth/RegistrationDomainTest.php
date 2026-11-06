<?php

use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    Role::firstOrCreate(['role_name' => 'faculty_staff'], ['description' => 'Faculty and staff']);
});

test('registration is restricted to the 8.ustp.edu.ph email domain', function (string $email) {
    fakeBrevoMail();

    $this->post(route('register.store'), registrationPayload(['email' => $email]))
        ->assertSessionHasErrors('email');

    expect(User::where('email', $email)->exists())->toBeFalse();
    Http::assertNothingSent();
})->with([
    'outsider@gmail.com',
    'person@ustp.edu.ph',
    'sub.domains@mail.8.ustp.edu.ph',
    'lookalike@8ustp.edu.ph',
    'spoofed@8.ustp.edu.ph.evil.com',
    'trailing dot@8.ustp.edu.ph.',
]);

test('the campus email domain is accepted case-insensitively', function () {
    fakeBrevoMail();

    $this->post(route('register.store'), registrationPayload([
        'email' => 'Test.User@8.USTP.EDU.PH',
    ]))->assertRedirect(route('register.otp.show'));
});

test('campus registrations start unapproved but email-verified after the OTP flow', function () {
    fakeBrevoMail();

    $this->post(route('register.store'), registrationPayload());
    $this->post(route('register.otp.verify'), ['code' => registrationOtpCode()])
        ->assertRedirect(route('faculty.login'));

    $user = User::where('email', 'test@8.ustp.edu.ph')->firstOrFail();

    expect($user->status)->toBe('active')
        ->and($user->is_approved)->toBeFalse()
        ->and($user->email_verified_at)->not->toBeNull();
});

test('registration payloads cannot self-approve the account', function () {
    fakeBrevoMail();

    $this->post(route('register.store'), registrationPayload([
        'is_approved' => true,
    ]))->assertRedirect(route('register.otp.show'));

    $this->post(route('register.otp.verify'), ['code' => registrationOtpCode()]);

    expect(User::where('email', 'test@8.ustp.edu.ph')->sole()->is_approved)->toBeFalse();
});

test('accounts cannot register twice with the same campus email', function () {
    fakeBrevoMail();
    User::factory()->create(['email' => 'taken@8.ustp.edu.ph']);

    $this->post(route('register.store'), registrationPayload([
        'email' => 'taken@8.ustp.edu.ph',
    ]))->assertSessionHasErrors('email');

    expect(User::where('email', 'taken@8.ustp.edu.ph')->count())->toBe(1);
});
