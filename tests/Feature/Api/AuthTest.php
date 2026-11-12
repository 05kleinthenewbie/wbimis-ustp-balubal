<?php

use App\Models\Role;
use App\Models\User;

it('can register and is activated immediately', function () {
    Role::create(['role_name' => 'faculty']);

    $payload = [
        'name' => 'New Faculty',
        'email' => 'new@ustp.edu.ph',
        'password' => 'password123',
        'password_confirmation' => 'password123',
        'role' => 'faculty',
        'employment_type' => 'non_teaching',
        'department' => 'Administrative Office',
    ];

    $response = $this->postJson('/api/v1/auth/register', $payload);

    $response->assertCreated()
        ->assertJsonStructure(['message', 'user']);

    $this->assertDatabaseHas('users', ['email' => 'new@ustp.edu.ph', 'status' => 'active']);
    expect(User::where('email', 'new@ustp.edu.ph')->sole()->facultyProfile->department->name)->toBe('Administrative Office');
});

it('rejects a faculty registration without an employment type', function () {
    Role::create(['role_name' => 'faculty']);

    $response = $this->postJson('/api/v1/auth/register', [
        'name' => 'New Faculty',
        'email' => 'new@ustp.edu.ph',
        'password' => 'password123',
        'password_confirmation' => 'password123',
        'role' => 'faculty',
        'employment_type' => null,
    ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['employment_type']);

    $this->assertDatabaseMissing('users', ['email' => 'new@ustp.edu.ph']);
});

it('can register as a student and is blocked until approved', function () {
    Role::create(['role_name' => 'student']);

    $response = $this->postJson('/api/v1/auth/register', [
        'name' => 'New Student',
        'email' => 'student@8.ustp.edu.ph',
        'password' => 'password123',
        'password_confirmation' => 'password123',
        'role' => 'student',
        'department' => 'BSIT',
        'id_number' => '2023303709',
    ]);

    $student = User::where('email', 'student@8.ustp.edu.ph')->sole();
    $this->assertDatabaseHas('student_profiles', ['user_id' => $student->id, 'id_number' => '2023303709']);
    expect($student->studentProfile->program->code)->toBe('BSIT');

    $response->assertCreated()
        ->assertJsonStructure(['message', 'user'])
        ->assertJsonPath('message', 'Account created. Sign in to verify your email and upload your Certificate of Registration (COR) for review.');

    $this->assertDatabaseHas('users', [
        'email' => 'student@8.ustp.edu.ph',
        'status' => 'active',
    ]);

    $login = $this->postJson('/api/v1/auth/login', [
        'email' => 'student@8.ustp.edu.ph',
        'password' => 'password123',
    ])->assertOk()->assertJsonPath('user.approval_status', 'pending')->assertJsonPath('user.email_verified_at', null);
    $this->withToken($login->json('access_token'))->getJson('/api/v1/dashboard')->assertForbidden();
});

it('accepts a student registration without a roster entry', function () {
    Role::create(['role_name' => 'student']);

    $response = $this->postJson('/api/v1/auth/register', [
        'name' => 'New Student',
        'email' => 'student@8.ustp.edu.ph',
        'password' => 'password123',
        'password_confirmation' => 'password123',
        'role' => 'student',
        'department' => 'BSIT',
        'id_number' => '9999999999',
    ]);

    $response->assertCreated();

    $this->assertDatabaseHas('student_profiles', ['user_id' => User::where('email', 'student@8.ustp.edu.ph')->sole()->id, 'id_number' => '9999999999']);
});

it('rejects a student registration without a department', function () {
    Role::create(['role_name' => 'student']);

    $response = $this->postJson('/api/v1/auth/register', [
        'name' => 'New Student',
        'email' => 'student@8.ustp.edu.ph',
        'password' => 'password123',
        'password_confirmation' => 'password123',
        'role' => 'student',
        'id_number' => '2023303709',
    ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['department']);

    $this->assertDatabaseMissing('users', ['email' => 'student@8.ustp.edu.ph']);
});

it('cannot login with pending account', function () {
    $user = User::factory()->create([
        'status' => 'pending',
        'password' => bcrypt('secret'),
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'secret',
    ]);

    $response->assertForbidden();
});

it('cannot login with inactive account', function () {
    $user = User::factory()->create([
        'status' => 'inactive',
        'password' => bcrypt('secret'),
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'secret',
    ]);

    $response->assertForbidden();
});

it('can login with active account', function () {
    $user = User::factory()->create([
        'status' => 'active',
        'password' => bcrypt('secret'),
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'secret',
    ]);

    $response->assertOk()
        ->assertJsonStructure([
            'access_token',
            'token_type',
            'expires_in',
            'user' => ['id', 'name', 'email'],
        ])
        ->assertJson(['token_type' => 'bearer']);
});

it('can get authenticated user profile', function () {
    $user = User::factory()->create(['status' => 'active']);
    $token = auth('api')->login($user);

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/v1/auth/me');

    $response->assertOk()
        ->assertJsonPath('user.id', $user->id);
});

it('can refresh token', function () {
    $user = User::factory()->create(['status' => 'active']);
    $token = auth('api')->login($user);

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/auth/refresh');

    $response->assertOk()
        ->assertJsonStructure(['access_token', 'token_type', 'expires_in']);
});

it('can logout', function () {
    $user = User::factory()->create(['status' => 'active']);
    $token = auth('api')->login($user);

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/auth/logout');

    $response->assertOk()
        ->assertJsonPath('message', 'Successfully logged out.');
});

it('cannot access protected endpoints without token', function () {
    $this->getJson('/api/v1/dashboard')->assertUnauthorized();
    $this->getJson('/api/v1/requests')->assertUnauthorized();
    $this->getJson('/api/v1/bookings')->assertUnauthorized();
});

it('requires credentials for login', function () {
    $this->postJson('/api/v1/auth/login', [])->assertUnprocessable()
        ->assertJsonValidationErrors(['email', 'password']);
});
