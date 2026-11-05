<?php

use App\Models\Role;
use App\Models\StudentRoster;
use App\Models\User;
use App\Services\RegistrationOtpService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

test('separate registration name fields survive email verification', function (string $role, ?string $initial, string $expectedName) {
    fakeBrevoMail();
    Role::firstOrCreate(['role_name' => $role]);
    $parts = ['first_name' => 'Juan', 'last_name' => 'Dela Cruz', 'middle_initial' => $initial];
    $payload = $role === 'student' ? studentRegistrationPayload($parts) : registrationPayload($parts);
    unset($payload['name']);

    $this->post(route('register.store'), $payload)->assertRedirect(route('register.otp.show'));
    $this->post(route('register.otp.verify'), ['code' => registrationOtpCode()])->assertRedirect();

    expect(User::where('email', $payload['email'])->firstOrFail()->name)->toBe($expectedName);
})->with([
    ['student', 's', 'Juan S. Dela Cruz'],
    ['faculty_staff', 'S.', 'Juan S. Dela Cruz'],
    ['student', null, 'Juan Dela Cruz'],
    ['faculty_staff', null, 'Juan Dela Cruz'],
]);

test('registration validates separate name fields', function (array $parts, string $field) {
    fakeBrevoMail();
    $this->post(route('register.store'), registrationPayload($parts))->assertSessionHasErrors($field);
    Http::assertNothingSent();
})->with([
    [['first_name' => '', 'last_name' => 'Dela Cruz'], 'first_name'],
    [['first_name' => 'Juan', 'last_name' => ''], 'last_name'],
    [['first_name' => 'Juan', 'last_name' => 'Dela Cruz', 'middle_initial' => 'Smith'], 'middle_initial'],
]);

beforeEach(function () {
    Storage::fake('local');
    Role::firstOrCreate(['role_name' => 'faculty_staff'], ['description' => 'Faculty and staff']);
});

test('registering emails an OTP and defers account creation', function () {
    fakeBrevoMail();

    $response = $this->post(route('register.store'), registrationPayload());

    $response->assertRedirect(route('register.otp.show'));
    $this->assertGuest();
    expect(User::where('email', 'test@example.com')->exists())->toBeFalse();

    Http::assertSentCount(1);
    expect(registrationOtpCode())->toHaveLength(6);
});

test('faculty employment details and private document survive OTP verification and admin review', function () {
    fakeBrevoMail();

    $this->post(route('register.store'), registrationPayload())
        ->assertRedirect(route('register.otp.show'));

    expect(User::where('email', 'test@example.com')->exists())->toBeFalse();

    $this->post(route('register.otp.verify'), ['code' => registrationOtpCode()])
        ->assertRedirect(route('faculty.login'));

    $faculty = User::where('email', 'test@example.com')->firstOrFail();
    expect($faculty->employee_id_number)->toBe('EMP-1001')
        ->and($faculty->position)->toBe('Administrative Assistant')
        ->and($faculty->contact_no)->toBe('09123456789')
        ->and($faculty->gender)->toBeNull()
        ->and($faculty->birth_date)->toBeNull()
        ->and($faculty->home_address)->toBeNull()
        ->and($faculty->status)->toBe('pending')
        ->and($faculty->toArray())->not->toHaveKey('employment_document_path');
    Storage::disk('local')->assertExists($faculty->employment_document_path);

    $this->post(route('login.store'), ['email' => $faculty->email, 'password' => 'password', 'portal' => 'faculty'])
        ->assertSessionHasErrors('email');
    $this->assertGuest();

    $adminRole = Role::firstOrCreate(['role_name' => 'ict_admin']);
    $admin = User::factory()->create(['role_id' => $adminRole->id]);
    $this->actingAs($admin)->get(route('users.employment-document', $faculty))
        ->assertDownload('employment.pdf');
    $this->get(route('users.index'))->assertInertia(fn (Assert $page) => $page
        ->where('pendingUsers.0.employment_document_url', route('users.employment-document', $faculty)));
    $this->put(route('users.update', $faculty), ['status' => 'active'])->assertRedirect();
    $this->post(route('logout'));
    $this->post(route('login.store'), ['email' => $faculty->email, 'password' => 'password', 'portal' => 'faculty'])
        ->assertRedirect(route('dashboard'));
    $this->assertAuthenticatedAs($faculty);
    $this->get(route('users.employment-document', $faculty))->assertForbidden();
});

test('faculty registration requires employment details', function (string $field) {
    fakeBrevoMail();
    $this->post(route('register.store'), registrationPayload([$field => null]))
        ->assertSessionHasErrors($field);
    Http::assertNothingSent();
})->with(['employee_id_number', 'position', 'contact_no', 'employment_document']);

test('faculty registration rejects unsupported and oversized employment documents', function () {
    fakeBrevoMail();
    foreach ([UploadedFile::fake()->create('employment.txt', 10, 'text/plain'), UploadedFile::fake()->create('employment.pdf', 5121, 'application/pdf')] as $file) {
        $this->post(route('register.store'), registrationPayload(['employment_document' => $file]))
            ->assertSessionHasErrors('employment_document');
    }
    Http::assertNothingSent();
});

test('failed OTP email removes the temporary employment document', function () {
    Http::fake(['api.brevo.com/*' => Http::response('Server error', 500)]);
    $this->post(route('register.store'), registrationPayload())->assertSessionHasErrors('email');
    expect(Storage::disk('local')->allFiles('employment-documents'))->toBeEmpty();
});

test('a student registers and is activated immediately', function () {
    Role::firstOrCreate(['role_name' => 'student'], ['description' => 'Students']);
    fakeBrevoMail();

    $this->post(route('register.store'), studentRegistrationPayload())
        ->assertRedirect(route('register.otp.show'));

    $this->post(route('register.otp.verify'), ['code' => registrationOtpCode()])
        ->assertRedirect(route('student.login'))
        ->assertSessionHas(
            'status',
            'Registration successful! You can now log in to your account.',
        );

    $this->get(route('student.login'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('auth/student-login'));

    $user = User::where('email', 'student@ustp.edu.ph')->first();

    expect($user)->not->toBeNull()
        ->and($user->status)->toBe('active')
        ->and($user->email_verified_at)->not->toBeNull()
        ->and($user->role->role_name)->toBe('student')
        ->and($user->department)->toBe('BSIT')
        ->and($user->name)->toBe('Juan S. Dela Cruz')
        ->and($user->educational_level)->toBe('college')
        ->and($user->year_level)->toBe('1');
});

test('a student can log in with email immediately after OTP verification', function () {
    Role::firstOrCreate(['role_name' => 'student'], ['description' => 'Students']);
    fakeBrevoMail();

    $this->post(route('register.store'), studentRegistrationPayload());
    $this->post(route('register.otp.verify'), ['code' => registrationOtpCode()]);

    $this->post(route('student.authenticate'), [
        'email' => 'student@ustp.edu.ph',
        'password' => 'password',
    ])->assertRedirect(route('dashboard'));

    $student = User::where('email', 'student@ustp.edu.ph')->firstOrFail();
    $this->assertAuthenticatedAs($student);
});

test('a student can register directly without an id number', function () {
    Role::firstOrCreate(['role_name' => 'student']);
    fakeBrevoMail();

    $this->post(route('register.store'), studentRegistrationPayload([
        'email' => 'unknown@ustp.edu.ph',
    ]))->assertRedirect(route('register.otp.show'));

    $this->post(route('register.otp.verify'), ['code' => registrationOtpCode()])
        ->assertRedirect(route('student.login'));

    $student = User::where('email', 'unknown@ustp.edu.ph')->firstOrFail();
    expect($student->name)->toBe('Juan S. Dela Cruz')
        ->and($student->department)->toBe('BSIT')
        ->and($student->status)->toBe('active');
});

test('a student can register with BAT as their department', function () {
    Role::firstOrCreate(['role_name' => 'student']);
    fakeBrevoMail();

    $this->post(route('register.store'), studentRegistrationPayload([
        'department' => 'BAT',
    ]))->assertRedirect(route('register.otp.show'));

    $this->post(route('register.otp.verify'), ['code' => registrationOtpCode()])
        ->assertRedirect(route('student.login'));

    expect(User::where('email', 'student@ustp.edu.ph')->sole()->department)->toBe('BAT');
});

test('a student registration with an invalid department is rejected', function () {
    StudentRoster::create([
        'id_number' => '2023303709',
        'name' => 'Juan S. Dela Cruz',
        'program' => 'BSIT',
    ]);
    fakeBrevoMail();

    $this->post(route('register.store'), studentRegistrationPayload([
        'department' => 'CITC',
    ]))->assertSessionHasErrors('department');

    Http::assertNothingSent();
});

test('a student registration without a department is rejected', function () {
    StudentRoster::create([
        'id_number' => '2023303709',
        'name' => 'Juan S. Dela Cruz',
        'program' => 'BSIT',
    ]);
    fakeBrevoMail();

    $this->post(route('register.store'), studentRegistrationPayload([
        'department' => null,
    ]))->assertSessionHasErrors('department');

    Http::assertNothingSent();
});

test('a non-teaching faculty registration requires a department', function () {
    fakeBrevoMail();

    $this->post(route('register.store'), registrationPayload([
        'department' => null,
    ]))->assertSessionHasErrors('department');

    Http::assertNothingSent();
    expect(User::where('email', 'test@example.com')->exists())->toBeFalse();
});

test('a faculty registration without an employment type is rejected', function () {
    fakeBrevoMail();

    $this->post(route('register.store'), registrationPayload([
        'employment_type' => null,
    ]))->assertSessionHasErrors('employment_type');

    Http::assertNothingSent();
    expect(User::where('email', 'test@example.com')->exists())->toBeFalse();
});

test('a teaching faculty registration requires a department', function () {
    fakeBrevoMail();

    $this->post(route('register.store'), registrationPayload([
        'employment_type' => 'teaching',
        'department' => null,
    ]))->assertSessionHasErrors('department');

    Http::assertNothingSent();
    expect(User::where('email', 'test@example.com')->exists())->toBeFalse();
});

test('a teaching faculty registration is stored with their department', function () {
    fakeBrevoMail();

    $this->post(route('register.store'), registrationPayload([
        'employment_type' => 'teaching',
        'department' => 'Department of Information Technology',
    ]))->assertRedirect(route('register.otp.show'));

    $this->post(route('register.otp.verify'), ['code' => registrationOtpCode()])
        ->assertRedirect(route('faculty.login'));

    $user = User::where('email', 'test@example.com')->first();

    expect($user->employment_type)->toBe('teaching')
        ->and($user->department)->toBe('Department of Information Technology');
});

test('a non-teaching faculty registration stores their department', function () {
    fakeBrevoMail();

    $this->post(route('register.store'), registrationPayload([
        'employment_type' => 'non_teaching',
        'department' => 'CITC',
    ]))->assertRedirect(route('register.otp.show'));

    $this->post(route('register.otp.verify'), ['code' => registrationOtpCode()])
        ->assertRedirect(route('faculty.login'));

    $user = User::where('email', 'test@example.com')->first();

    expect($user->employment_type)->toBe('non_teaching')
        ->and($user->department)->toBe('CITC');
});

test('the OTP verification page renders', function () {
    fakeBrevoMail();

    $this->post(route('register.store'), registrationPayload());

    $this->get(route('register.otp.show'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('auth/register-otp')
            ->where('email', 'test@example.com'));
});

test('the OTP page redirects to registration without a pending session', function () {
    $this->get(route('register.otp.show'))->assertRedirect(route('register'));
});

test('a correct OTP creates the account', function () {
    fakeBrevoMail();

    $this->post(route('register.store'), registrationPayload());
    $code = registrationOtpCode();

    $this->post(route('register.otp.verify'), ['code' => $code])
        ->assertRedirect(route('faculty.login'))
        ->assertSessionHas('status');

    $user = User::where('email', 'test@example.com')->first();

    expect($user)->not->toBeNull()
        ->and($user->status)->toBe('pending')
        ->and($user->email_verified_at)->not->toBeNull()
        ->and(cache(RegistrationOtpService::key('test@example.com')))->toBeNull()
        ->and(session('registration_otp_email'))->toBeNull();
});

test('an incorrect OTP is rejected but the account can still be created', function () {
    fakeBrevoMail();

    $this->post(route('register.store'), registrationPayload());
    $code = registrationOtpCode();

    $this->post(route('register.otp.verify'), ['code' => '000000'])
        ->assertSessionHasErrors('code');

    expect(User::where('email', 'test@example.com')->exists())->toBeFalse();

    $this->post(route('register.otp.verify'), ['code' => $code])
        ->assertRedirect(route('faculty.login'));

    expect(User::where('email', 'test@example.com')->exists())->toBeTrue();
});

test('an expired OTP cannot be verified', function () {
    fakeBrevoMail();

    $this->post(route('register.store'), registrationPayload());
    $code = registrationOtpCode();

    $this->travel(RegistrationOtpService::EXPIRY_MINUTES + 1)->minutes();

    $this->post(route('register.otp.verify'), ['code' => $code])
        ->assertSessionHasErrors('email');

    expect(User::where('email', 'test@example.com')->exists())->toBeFalse();
});

test('too many incorrect attempts invalidate the OTP', function () {
    fakeBrevoMail();

    $this->post(route('register.store'), registrationPayload());
    $code = registrationOtpCode();

    foreach (range(1, RegistrationOtpService::MAX_ATTEMPTS) as $attempt) {
        $this->post(route('register.otp.verify'), ['code' => '000000'])
            ->assertSessionHasErrors('code');
    }

    $this->post(route('register.otp.verify'), ['code' => $code])
        ->assertSessionHasErrors('email');

    expect(User::where('email', 'test@example.com')->exists())->toBeFalse();
});

test('resending issues a new code that replaces the old one', function () {
    fakeBrevoMail();

    $this->post(route('register.store'), registrationPayload());
    $first = registrationOtpCode();

    $this->post(route('register.otp.resend'))
        ->assertRedirect(route('register.otp.show'))
        ->assertSessionHas('status');

    Http::assertSentCount(2);

    $second = registrationOtpCode();
    expect($second)->toHaveLength(6);

    $this->post(route('register.otp.verify'), ['code' => $first])
        ->assertSessionHasErrors('code');

    $this->post(route('register.otp.verify'), ['code' => $second])
        ->assertRedirect(route('faculty.login'));
});

test('registration OTP requests are rate limited', function () {
    fakeBrevoMail();

    $this->post(route('register.store'), registrationPayload());
    $this->post(route('register.otp.resend'));
    $this->post(route('register.otp.resend'));

    $this->post(route('register.otp.resend'))
        ->assertSessionHasErrors('resend');

    Http::assertSentCount(3);
});

test('a failed OTP send reports an error and creates nothing', function () {
    Http::fake(['api.brevo.com/*' => Http::response('Server error', 500)]);

    $this->post(route('register.store'), registrationPayload())
        ->assertSessionHasErrors('email');

    expect(User::where('email', 'test@example.com')->exists())->toBeFalse();
});

test('registration validation failures do not send an OTP', function () {
    fakeBrevoMail();

    $this->post(route('register.store'), registrationPayload([
        'password_confirmation' => 'mismatched',
    ]))->assertSessionHasErrors('password');

    Http::assertNothingSent();
    expect(User::where('email', 'test@example.com')->exists())->toBeFalse();
});

test('registering requires agreeing to the terms and privacy policy', function () {
    fakeBrevoMail();

    $this->post(route('register.store'), registrationPayload([
        'terms' => null,
    ]))->assertSessionHasErrors('terms');

    Http::assertNothingSent();
    expect(User::where('email', 'test@example.com')->exists())->toBeFalse();
});
