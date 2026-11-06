<?php

use App\Models\Role;
use App\Models\User;

test('registration screen can be rendered', function () {
    $response = $this->get(route('register'));

    $response->assertOk();
});

test('new users can register', function () {
    fakeBrevoMail();
    Role::firstOrCreate(['role_name' => 'faculty_staff'], ['description' => 'Faculty and staff']);

    $response = $this->post(route('register.store'), registrationPayload());

    $response->assertRedirect(route('register.otp.show'));
    $this->assertGuest();
    expect(User::where('email', 'test@8.ustp.edu.ph')->exists())->toBeFalse();

    $this->post(route('register.otp.verify'), ['code' => registrationOtpCode()])
        ->assertRedirect(route('faculty.login'));

    $user = User::where('email', 'test@8.ustp.edu.ph')->first();

    expect($user)->not->toBeNull()
        ->and($user->status)->toBe('active')
        ->and($user->email_verified_at)->not->toBeNull();
});
