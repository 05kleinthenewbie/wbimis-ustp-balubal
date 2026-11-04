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

test('a student can register with a COR and waits for admin approval', function () {
    Role::firstOrCreate(['role_name' => 'student'], ['description' => 'Students']);
    $roster = StudentRoster::create([
        'id_number' => '2023303709',
        'name' => 'Legacy Roster Name',
        'program' => 'BSA',
    ]);
    fakeBrevoMail();

    $this->post(route('register.store'), studentRegistrationPayload())
        ->assertRedirect(route('register.otp.show'));

    $this->post(route('register.otp.verify'), ['code' => registrationOtpCode()])
        ->assertRedirect(route('student.login'))
        ->assertSessionHas('registration_id_number', '2023303709')
        ->assertSessionHas(
            'status',
            'Registration successful! Your account is pending ICT Admin approval. You will be able to log in once approved.',
        );

    $this->get(route('student.login'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('auth/student-login')
            ->where('idNumber', '2023303709')
            ->where('status', 'Registration successful! Your account is pending ICT Admin approval. You will be able to log in once approved.'));

    $user = User::where('email', 'student@ustp.edu.ph')->first();

    expect($user)->not->toBeNull()
        ->and($user->status)->toBe('pending')
        ->and($user->email_verified_at)->not->toBeNull()
        ->and($user->role->role_name)->toBe('student')
        ->and($user->id_number)->toBe('2023303709')
        ->and($user->department)->toBe('BSIT')
        ->and($user->name)->toBe('Juan S. Dela Cruz')
        ->and($user->educational_level)->toBe('college')
        ->and($user->year_level)->toBe('1')
        ->and($user->gender)->toBeNull()
        ->and($user->birth_date)->toBeNull()
        ->and($user->home_address)->toBeNull()
        ->and($user->cor_original_name)->toBe('cor.pdf')
        ->and(Storage::disk('local')->exists((string) $user->cor_path))->toBeTrue()
        ->and($user->cor_verification_status)->toBe('manual_review')
        ->and($user->cor_checked_at)->not->toBeNull()
        ->and($roster->refresh()->user_id)->toBeNull();
});

test('a student with a COR waits for admin approval before logging in', function () {
    Role::firstOrCreate(['role_name' => 'student'], ['description' => 'Students']);
    StudentRoster::create([
        'id_number' => '2023303709',
        'name' => 'Juan S. Dela Cruz',
        'program' => 'BSIT',
    ]);
    $adminRole = Role::firstOrCreate(['role_name' => 'ict_admin'], ['description' => 'ICT Admins']);
    $admin = User::factory()->create(['role_id' => $adminRole->id]);
    fakeBrevoMail();

    $this->post(route('register.store'), studentRegistrationPayload());
    $this->post(route('register.otp.verify'), ['code' => registrationOtpCode()]);

    $this->post(route('student.authenticate'), [
        'id_number' => '2023303709',
        'password' => 'password',
    ])->assertSessionHasErrors('id_number');

    $this->assertGuest();

    $student = User::where('email', 'student@ustp.edu.ph')->firstOrFail();

    $this->actingAs($admin)
        ->put(route('users.update', $student->id), ['status' => 'active'])
        ->assertRedirect();

    $this->post(route('logout'));
    $this->post(route('student.authenticate'), [
        'id_number' => '2023303709',
        'password' => 'password',
    ])->assertRedirect(route('dashboard'));

    $this->assertAuthenticatedAs($student->refresh());
});

test('student registration requires either a student ID or COR', function () {
    StudentRoster::create([
        'id_number' => '2023303709',
        'name' => 'Juan S. Dela Cruz',
        'program' => 'BSIT',
    ]);
    fakeBrevoMail();

    $this->post(route('register.store'), studentRegistrationPayload([
        'cor' => null,
    ]))->assertSessionHasErrors([
        'cor' => 'Upload your student ID or Certificate of Registration (COR).',
    ]);

    Http::assertNothingSent();
    expect(User::where('email', 'student@ustp.edu.ph')->exists())->toBeFalse();
});

test('students can upload an ID image through OTP and admins can preview and approve it', function () {
    Role::firstOrCreate(['role_name' => 'student']);
    fakeBrevoMail();
    $image = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1sAAAAASUVORK5CYII=');
    $payload = studentRegistrationPayload([
        'cor' => UploadedFile::fake()->createWithContent('student-id.png', $image),
    ]);

    $this->post(route('register.store'), $payload)->assertRedirect(route('register.otp.show'));
    $pending = app(RegistrationOtpService::class)->pending($payload['email']);
    expect($pending['payload']['cor_original_name'])->toBe('student-id.png');
    $this->assertDatabaseMissing('users', ['email' => $payload['email']]);

    $this->post(route('register.otp.verify'), ['code' => registrationOtpCode()])
        ->assertRedirect(route('student.login'));
    $student = User::where('email', $payload['email'])->firstOrFail();
    expect($student->status)->toBe('pending')
        ->and($student->cor_original_name)->toBe('student-id.png')
        ->and($student->cor_verification_status)->toBe('manual_review')
        ->and($student->approval_block_reason)->toBeNull();
    Storage::disk('local')->assertExists($student->cor_path);

    $admin = User::factory()->create(['role_id' => Role::firstOrCreate(['role_name' => 'ict_admin'])->id]);
    $this->actingAs($admin)->get(route('users.index'))->assertInertia(fn (Assert $page) => $page
        ->where('pendingUsers.0.cor_url', route('users.cor', $student))
        ->where('pendingUsers.0.approval_block_reason', null));
    $this->get(route('users.cor', $student))
        ->assertOk()->assertHeader('Content-Type', 'image/png')
        ->assertHeader('Content-Disposition', 'inline; filename=student-id.png')
        ->assertStreamedContent($image);
    $this->put(route('users.update', $student), ['status' => 'active'])
        ->assertSessionHasNoErrors()->assertRedirect();
    expect($student->refresh()->status)->toBe('active');
});

test('student registration rejects an unsupported COR file type', function () {
    StudentRoster::create([
        'id_number' => '2023303709',
        'name' => 'Juan S. Dela Cruz',
        'program' => 'BSIT',
    ]);
    fakeBrevoMail();

    $this->post(route('register.store'), studentRegistrationPayload([
        'cor' => UploadedFile::fake()->create('cor.txt', 100, 'text/plain'),
    ]))->assertSessionHasErrors('cor');

    Http::assertNothingSent();
});

test('student registration rejects a COR larger than five megabytes', function () {
    StudentRoster::create([
        'id_number' => '2023303709',
        'name' => 'Juan S. Dela Cruz',
        'program' => 'BSIT',
    ]);
    fakeBrevoMail();

    $this->post(route('register.store'), studentRegistrationPayload([
        'cor' => UploadedFile::fake()->create('cor.pdf', 5121, 'application/pdf'),
    ]))->assertSessionHasErrors('cor');

    Http::assertNothingSent();
});

test('a deactivated student cannot register again with the same id number', function () {
    Role::firstOrCreate(['role_name' => 'student'], ['description' => 'Students']);
    StudentRoster::create([
        'id_number' => '2023303709',
        'name' => 'Juan S. Dela Cruz',
        'program' => 'BSIT',
    ]);
    User::factory()->create([
        'email' => 'blocked@ustp.edu.ph',
        'status' => 'inactive',
        'id_number' => '2023303709',
        'role_id' => Role::firstOrCreate(['role_name' => 'student'])->id,
    ]);
    fakeBrevoMail();

    $this->post(route('register.store'), studentRegistrationPayload([
        'email' => 'new@ustp.edu.ph',
    ]))->assertSessionHasErrors('id_number');

    Http::assertNothingSent();
    expect(User::where('email', 'new@ustp.edu.ph')->exists())->toBeFalse();
});

test('a student can register directly without a rostered id number', function () {
    Role::firstOrCreate(['role_name' => 'student']);
    fakeBrevoMail();

    $this->post(route('register.store'), studentRegistrationPayload([
        'email' => 'unknown@ustp.edu.ph',
        'id_number' => '9999999999',
    ]))->assertRedirect(route('register.otp.show'));

    $this->post(route('register.otp.verify'), ['code' => registrationOtpCode()])
        ->assertRedirect(route('student.login'));
    $student = User::where('email', 'unknown@ustp.edu.ph')->firstOrFail();
    expect($student->id_number)->toBe('9999999999')
        ->and($student->name)->toBe('Juan S. Dela Cruz')
        ->and($student->department)->toBe('BSIT')
        ->and($student->status)->toBe('pending')
        ->and($student->cor_checked_at)->not->toBeNull();
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
