<?php

use App\Actions\Fortify\CreateNewUser;
use App\Models\Role;
use App\Models\User;
use Illuminate\Validation\ValidationException;

test('rejected accounts can register again', function () {
    fakeBrevoMail();
    Role::firstOrCreate(['role_name' => 'faculty_staff'], ['description' => 'Faculty and staff']);

    $rejected = User::factory()->create([
        'email' => 'rejected@8.ustp.edu.ph',
        'status' => 'inactive',
    ]);

    $this->post(route('register.store'), registrationPayload([
        'name' => 'Returning User',
        'email' => 'rejected@8.ustp.edu.ph',
    ]))->assertRedirect(route('register.otp.show'));

    $this->post(route('register.otp.verify'), ['code' => registrationOtpCode()])
        ->assertRedirect(route('faculty.login'));

    $user = User::where('email', 'rejected@8.ustp.edu.ph')->first();

    expect($user->id)->toBe($rejected->id)
        ->and($user->status)->toBe('active')
        ->and(User::where('email', 'rejected@8.ustp.edu.ph')->count())->toBe(1);
});

test('deactivated students can register again and are reactivated', function () {
    fakeBrevoMail();
    $studentRole = Role::firstOrCreate(['role_name' => 'student'], ['description' => 'Student']);

    $deactivated = User::factory()->create([
        'email' => 'deactivated.student@8.ustp.edu.ph',
        'role_id' => $studentRole->id,
        'status' => 'inactive',
    ]);

    $this->post(route('register.store'), studentRegistrationPayload([
        'name' => 'Returning Student',
        'email' => 'deactivated.student@8.ustp.edu.ph',
    ]))->assertRedirect(route('register.otp.show'));

    $this->post(route('register.otp.verify'), ['code' => registrationOtpCode()])
        ->assertRedirect(route('student.login'));

    $user = User::where('email', 'deactivated.student@8.ustp.edu.ph')->sole();

    expect($user->id)->toBe($deactivated->id)
        ->and($user->status)->toBe('active')
        ->and($user->email_verified_at)->not->toBeNull();
});

test('active emails still cannot register twice', function () {
    Role::firstOrCreate(['role_name' => 'faculty_staff'], ['description' => 'Faculty and staff']);

    User::factory()->create([
        'email' => 'active@8.ustp.edu.ph',
        'status' => 'active',
    ]);

    expect(fn () => app(CreateNewUser::class)->create([
        'name' => 'Duplicate User',
        'email' => 'active@8.ustp.edu.ph',
        'password' => 'password',
        'password_confirmation' => 'password',
        'role' => 'faculty_staff',
    ]))->toThrow(ValidationException::class);
});
