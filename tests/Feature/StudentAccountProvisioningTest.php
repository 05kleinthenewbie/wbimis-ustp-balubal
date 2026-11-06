<?php

use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

test('student self registration uses the submitted details and chosen password', function () {
    Storage::fake('local');
    fakeBrevoMail();
    Role::firstOrCreate(['role_name' => 'student']);
    $this->post(route('register.store'), studentRegistrationPayload())->assertRedirect(route('register.otp.show'));
    $this->post(route('register.otp.verify'), ['code' => registrationOtpCode()])->assertRedirect(route('student.login'));
    $user = User::where('email', 'student@ustp.edu.ph')->firstOrFail();
    expect($user->status)->toBe('active')
        ->and($user->name)->toBe('Juan S. Dela Cruz')
        ->and($user->department)->toBe('BSIT')
        ->and(Hash::check('password', $user->password))->toBeTrue();
});

test('guests can open the dedicated student login form', function () {
    $this->get(route('student.login'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('auth/student-login'));
});

test('students log in with their email and password and land on the dashboard', function () {
    $role = Role::firstOrCreate(['role_name' => 'student']);
    $user = User::factory()->create([
        'role_id' => $role->id,
        'email' => 'student@ustp.edu.ph',
        'password' => 'password',
        'status' => 'active',
    ]);

    $this->post(route('student.authenticate'), [
        'email' => 'student@ustp.edu.ph',
        'password' => 'password',
    ])->assertRedirect(route('dashboard'));

    $this->assertAuthenticatedAs($user);

    $this->get(route('dashboard'))->assertOk();
});

test('the student login form rejects credentials that do not match', function () {
    $role = Role::firstOrCreate(['role_name' => 'student']);
    User::factory()->create([
        'role_id' => $role->id,
        'email' => 'student@ustp.edu.ph',
        'password' => 'password',
        'status' => 'active',
    ]);

    $this->post(route('student.authenticate'), [
        'email' => 'student@ustp.edu.ph',
        'password' => 'WrongPassword1',
    ])->assertSessionHasErrors('email');

    $this->assertGuest();
});

test('the student login form only accepts student accounts', function () {
    $role = Role::firstOrCreate(['role_name' => 'faculty_staff']);
    User::factory()->create([
        'role_id' => $role->id,
        'email' => 'faculty@ustp.edu.ph',
        'password' => 'password',
        'status' => 'active',
    ]);

    $this->post(route('student.authenticate'), [
        'email' => 'faculty@ustp.edu.ph',
        'password' => 'password',
    ])->assertSessionHasErrors('email');

    $this->assertGuest();
});

test('the student login form blocks deactivated accounts', function () {
    $role = Role::firstOrCreate(['role_name' => 'student']);
    User::factory()->create([
        'role_id' => $role->id,
        'email' => 'student@ustp.edu.ph',
        'password' => 'password',
        'status' => 'inactive',
    ]);

    $this->post(route('student.authenticate'), [
        'email' => 'student@ustp.edu.ph',
        'password' => 'password',
    ])->assertSessionHasErrors('email');

    $this->assertGuest();
});

test('duplicate student accounts are prevented for the same email', function () {
    Storage::fake('local');
    fakeBrevoMail();
    User::factory()->create(['email' => 'student@ustp.edu.ph', 'status' => 'active']);
    $this->post(route('register.store'), studentRegistrationPayload(['name' => 'Duplicate']))
        ->assertSessionHasErrors('email');

    expect(User::where('email', 'student@ustp.edu.ph')->count())->toBe(1);
});

test('students can authenticate through the api with their id number', function () {
    $role = Role::firstOrCreate(['role_name' => 'student']);
    User::factory()->create([
        'role_id' => $role->id,
        'id_number' => '2023303709',
        'password' => 'TempPass1234',
        'status' => 'active',
    ]);

    $this->postJson('/api/v1/auth/login', [
        'email' => '2023303709',
        'password' => 'TempPass1234',
    ])->assertOk()->assertJsonStructure(['access_token', 'token_type', 'user']);
});
