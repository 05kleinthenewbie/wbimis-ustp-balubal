<?php

use App\Models\Role;
use App\Models\StudentRoster;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

function studentAccountAdmin(): User
{
    $role = Role::firstOrCreate(['role_name' => 'ict_admin']);

    return User::factory()->create(['role_id' => $role->id]);
}

function studentAccountFaculty(): User
{
    $role = Role::firstOrCreate(['role_name' => 'faculty_staff']);

    return User::factory()->create(['role_id' => $role->id]);
}

/**
 * @return array<string, string>
 */
function studentRosterPayload(array $overrides = []): array
{
    return array_merge([
        'id_number' => '2023303709',
        'name' => 'Juan S. Dela Cruz',
        'program' => 'BSIT',
        'email' => 'juan.delacruz@gmail.com',
    ], $overrides);
}

test('student self registration uses the submitted details and chosen password without a roster', function () {
    Storage::fake('local');
    fakeBrevoMail();
    Role::firstOrCreate(['role_name' => 'student']);
    $this->post(route('register.store'), studentRegistrationPayload())->assertRedirect(route('register.otp.show'));
    $this->post(route('register.otp.verify'), ['code' => registrationOtpCode()])->assertRedirect(route('student.login'));
    $user = User::where('email', 'student@ustp.edu.ph')->firstOrFail();
    expect($user->status)->toBe('active')
        ->and($user->name)->toBe('Juan S. Dela Cruz')
        ->and($user->department)->toBe('BSIT')
        ->and(Hash::check('password', $user->password))->toBeTrue()
        ->and(StudentRoster::count())->toBe(0);
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

test('retired roster password reset cannot replace a student chosen password', function () {
    $admin = studentAccountAdmin();
    $user = User::factory()->create(['id_number' => '2023303709']);
    $student = StudentRoster::create([...studentRosterPayload(), 'user_id' => $user->id]);
    $this->actingAs($admin)->post('/student-roster/'.$student->id.'/reset-password')->assertNotFound();
    expect(Hash::check('password', $user->refresh()->password))->toBeTrue();
});

test('non admins cannot reset student passwords', function () {
    $student = StudentRoster::create(studentRosterPayload());
    $faculty = studentAccountFaculty();

    $this->actingAs($faculty)
        ->post('/student-roster/'.$student->id.'/reset-password')
        ->assertNotFound();
});

test('duplicate student accounts are prevented for the same email', function () {
    Storage::fake('local');
    fakeBrevoMail();
    User::factory()->create(['email' => 'student@ustp.edu.ph', 'status' => 'active']);
    $this->post(route('register.store'), studentRegistrationPayload(['name' => 'Duplicate']))
        ->assertSessionHasErrors('email');

    expect(User::where('email', 'student@ustp.edu.ph')->count())->toBe(1);
});

test('retired imports cannot provision active accounts', function () {
    $admin = studentAccountAdmin();

    $csv = implode("\n", [
        'id_number,name,program,email',
        '2023303710,New Student One,BSA,one@gmail.com',
        '2023303711,New Student Two,BTLED,two@gmail.com',
        'invalid,Missing Program Check,XYZ,bad@gmail.com',
    ]);

    $this->actingAs($admin)->post('/student-roster/import', [
        'csv_file' => UploadedFile::fake()->createWithContent('roster.csv', $csv),
    ])->assertNotFound();

    expect(User::whereIn('id_number', ['2023303710', '2023303711'])->count())->toBe(0)
        ->and(session('student_credentials'))->toBeNull();
});

test('retired roster actions cannot recreate accounts or replace their passwords', function () {
    $admin = studentAccountAdmin();
    $user = User::factory()->create(['id_number' => '2023303709', 'status' => 'active']);
    $student = StudentRoster::create([...studentRosterPayload(), 'user_id' => $user->id]);
    $this->actingAs($admin)->delete('/student-roster/'.$student->id)->assertNotFound();
    $this->actingAs($admin)->post('/student-roster', studentRosterPayload())->assertNotFound();

    expect(User::where('id_number', '2023303709')->count())->toBe(1)
        ->and($user->status)->toBe('active')
        ->and(Hash::check('password', $user->refresh()->password))->toBeTrue();
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
