<?php

use App\Actions\Fortify\CreateNewUser;
use App\Models\Role;
use App\Models\User;
use Illuminate\Validation\ValidationException;

test('rejected accounts can register again', function () {
    fakeBrevoMail();
    Role::firstOrCreate(['role_name' => 'faculty_staff'], ['description' => 'Faculty and staff']);

    $rejected = User::factory()->create([
        'email' => 'rejected@example.com',
        'status' => 'inactive',
    ]);

    $this->post(route('register.store'), registrationPayload([
        'name' => 'Returning User',
        'email' => 'rejected@example.com',
    ]))->assertRedirect(route('register.otp.show'));

    $this->post(route('register.otp.verify'), ['code' => registrationOtpCode()])
        ->assertRedirect(route('faculty.login'));

    $user = User::where('email', 'rejected@example.com')->first();

    expect($user->id)->toBe($rejected->id)
        ->and($user->status)->toBe('pending')
        ->and(User::where('email', 'rejected@example.com')->count())->toBe(1);
});

test('rejected students can register again with the same email and student id', function () {
    fakeBrevoMail();
    $studentRole = Role::firstOrCreate(['role_name' => 'student'], ['description' => 'Student']);
    $adminRole = Role::firstOrCreate(['role_name' => 'ict_admin'], ['description' => 'ICT Administrator']);

    $rejected = User::factory()->create([
        'email' => 'rejected.student@example.com',
        'id_number' => '2023303709',
        'role_id' => $studentRole->id,
        'status' => 'pending',
    ]);

    $admin = User::factory()->create([
        'role_id' => $adminRole->id,
        'status' => 'active',
    ]);

    $this->actingAs($admin)
        ->put(route('users.update', $rejected->id), ['status' => 'rejected'])
        ->assertRedirect();

    $this->post(route('logout'));
    $this->assertGuest();

    expect(User::whereKey($rejected->id)->exists())->toBeFalse();

    $this->post(route('register.store'), studentRegistrationPayload([
        'name' => 'Returning Student',
        'email' => 'rejected.student@example.com',
        'id_number' => '2023303709',
    ]))->assertRedirect(route('register.otp.show'));

    $this->post(route('register.otp.verify'), ['code' => registrationOtpCode()])
        ->assertRedirect(route('student.login'));

    $user = User::where('email', 'rejected.student@example.com')->sole();

    expect($user->id)->not->toBe($rejected->id)
        ->and($user->status)->toBe('pending')
        ->and($user->id_number)->toBe('2023303709');
});

test('active emails still cannot register twice', function () {
    Role::firstOrCreate(['role_name' => 'faculty_staff'], ['description' => 'Faculty and staff']);

    User::factory()->create([
        'email' => 'active@example.com',
        'status' => 'active',
    ]);

    expect(fn () => app(CreateNewUser::class)->create([
        'name' => 'Duplicate User',
        'email' => 'active@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'role' => 'faculty_staff',
    ]))->toThrow(ValidationException::class);
});
