<?php

use App\Models\Role;
use App\Models\User;

function registrationStudentRole(): Role
{
    return Role::firstOrCreate(['role_name' => 'student']);
}

test('new student details pass the pre-registration check', function () {
    registrationStudentRole();

    $this->postJson(route('register.validate'), [
        'email' => 'new.student@example.com',
        'id_number' => '2026123456',
        'role' => 'student',
    ])
        ->assertOk()
        ->assertJson([
            'valid' => true,
            'errors' => [],
        ]);
});

test('the pre-registration check rejects an email already in use', function () {
    $role = registrationStudentRole();
    User::factory()->create([
        'role_id' => $role->id,
        'email' => 'taken@example.com',
        'status' => 'active',
    ]);

    $this->postJson(route('register.validate'), [
        'email' => 'taken@example.com',
        'id_number' => '2026123457',
        'role' => 'student',
    ])
        ->assertOk()
        ->assertJsonPath('valid', false)
        ->assertJsonPath(
            'errors.email',
            'This email address is already registered. Sign in instead or use a different email.',
        );
});

test('the pre-registration check rejects a student ID already linked to an account', function () {
    $role = registrationStudentRole();
    User::factory()->create([
        'role_id' => $role->id,
        'id_number' => '2023303709',
        'status' => 'active',
    ]);

    $this->postJson(route('register.validate'), [
        'email' => 'another.student@example.com',
        'id_number' => '2023303709',
        'role' => 'student',
    ])
        ->assertOk()
        ->assertJsonPath('valid', false)
        ->assertJsonPath(
            'errors.id_number',
            'This student ID number is already linked to another account.',
        );
});

test('the pre-registration check rejects a non-numeric student ID', function () {
    registrationStudentRole();

    $this->postJson(route('register.validate'), [
        'email' => 'new.student@example.com',
        'id_number' => 'student-123',
        'role' => 'student',
    ])
        ->assertOk()
        ->assertJsonPath('valid', false)
        ->assertJsonPath(
            'errors.id_number',
            'Use numbers only for your student ID number.',
        );
});

test('the pre-registration check requires a 10-digit student ID', function () {
    registrationStudentRole();

    $this->postJson(route('register.validate'), [
        'email' => 'new.student@example.com',
        'id_number' => '202612345',
        'role' => 'student',
    ])
        ->assertOk()
        ->assertJsonPath('valid', false)
        ->assertJsonPath(
            'errors.id_number',
            'Student ID number must be exactly 10 digits.',
        );
});

test('inactive accounts do not block their previous email or student ID', function () {
    $role = registrationStudentRole();
    User::factory()->create([
        'role_id' => $role->id,
        'email' => 'returning@example.com',
        'id_number' => '2023303710',
        'status' => 'inactive',
    ]);

    $this->postJson(route('register.validate'), [
        'email' => 'returning@example.com',
        'id_number' => '2023303710',
        'role' => 'student',
    ])
        ->assertOk()
        ->assertJson([
            'valid' => true,
            'errors' => [],
        ]);
});
