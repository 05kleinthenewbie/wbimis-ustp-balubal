<?php

use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    Role::firstOrCreate(['role_name' => 'faculty'], ['description' => 'Faculty']);
});

test('faculty registration is restricted to the ustp.edu.ph email domain', function (string $email) {
    fakeBrevoMail();

    $this->post(route('register.store'), registrationPayload(['email' => $email]))
        ->assertSessionHasErrors('email');

    expect(User::where('email', $email)->exists())->toBeFalse();
    Http::assertNothingSent();
})->with([
    'outsider@gmail.com',
    'person@8.ustp.edu.ph',
    'sub.domains@mail.ustp.edu.ph',
    'lookalike@fakeustp.edu.ph',
    'spoofed@ustp.edu.ph.evil.com',
    'trailing dot@ustp.edu.ph.',
]);

test('the campus email domain is accepted case-insensitively', function () {
    fakeBrevoMail();

    $this->post(route('register.store'), registrationPayload([
        'email' => 'Test.User@USTP.EDU.PH',
    ]))->assertRedirect(route('register.otp.show'));
});

test('campus faculty registrations are approved and signed in after the OTP flow', function () {
    fakeBrevoMail();

    $this->post(route('register.store'), registrationPayload());
    $this->post(route('register.otp.verify'), ['code' => registrationOtpCode()])
        ->assertRedirect(route('dashboard'));

    $user = User::where('email', 'test@ustp.edu.ph')->firstOrFail();

    expect($user->status)->toBe('active')
        ->and($user->is_approved)->toBeTrue()
        ->and($user->email_verified_at)->not->toBeNull();

    $this->assertAuthenticatedAs($user);
});

test('registration payloads cannot self-approve a student account', function () {
    fakeBrevoMail();
    Role::firstOrCreate(['role_name' => 'student'], ['description' => 'Students']);

    $this->post(route('register.store'), studentRegistrationPayload([
        'is_approved' => true,
    ]))->assertRedirect(route('register.otp.show'));

    $this->post(route('register.otp.verify'), ['code' => registrationOtpCode()]);

    expect(User::where('email', 'student@8.ustp.edu.ph')->sole()->is_approved)->toBeFalse();
});

test('accounts cannot register twice with the same campus email', function () {
    fakeBrevoMail();
    User::factory()->create(['email' => 'taken@ustp.edu.ph']);

    $this->post(route('register.store'), registrationPayload([
        'email' => 'taken@ustp.edu.ph',
    ]))->assertSessionHasErrors('email');

    expect(User::where('email', 'taken@ustp.edu.ph')->count())->toBe(1);
});
