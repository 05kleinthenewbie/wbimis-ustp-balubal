<?php

use App\Actions\Fortify\CreateNewUser;
use App\Models\Role;
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
    ['faculty', 'S.', 'Juan S. Dela Cruz'],
    ['student', null, 'Juan Dela Cruz'],
    ['faculty', null, 'Juan Dela Cruz'],
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
    Role::firstOrCreate(['role_name' => 'faculty'], ['description' => 'Faculty']);
});

test('registering emails an OTP and defers account creation', function () {
    fakeBrevoMail();

    $response = $this->post(route('register.store'), registrationPayload());

    $response->assertRedirect(route('register.otp.show'));
    $this->assertGuest();
    expect(User::where('email', 'test@ustp.edu.ph')->exists())->toBeFalse();

    Http::assertSentCount(1);
    expect(registrationOtpCode())->toHaveLength(6);
});

test('faculty employment details survive OTP verification and the account is activated immediately', function () {
    fakeBrevoMail();

    $this->post(route('register.store'), registrationPayload())
        ->assertRedirect(route('register.otp.show'));

    expect(User::where('email', 'test@ustp.edu.ph')->exists())->toBeFalse();

    $this->post(route('register.otp.verify'), ['code' => registrationOtpCode()])
        ->assertRedirect(route('dashboard'));

    $faculty = User::where('email', 'test@ustp.edu.ph')->firstOrFail();
    expect($faculty->position)->toBe('Administrative Assistant')
        ->and($faculty->contact_no)->toBe('09123456789')
        ->and($faculty->status)->toBe('active')
        ->and($faculty->email_verified_at)->not->toBeNull();
});

test('faculty registration requires employment details', function (string $field) {
    fakeBrevoMail();
    $this->post(route('register.store'), registrationPayload([$field => null]))
        ->assertSessionHasErrors($field);
    Http::assertNothingSent();
})->with(['position', 'contact_no']);

test('a student registers with their COR and awaits administrator approval', function () {
    Role::firstOrCreate(['role_name' => 'student'], ['description' => 'Students']);
    fakeBrevoMail();

    $this->post(route('register.store'), studentRegistrationPayload())
        ->assertRedirect(route('register.otp.show'));

    $this->post(route('register.otp.verify'), ['code' => registrationOtpCode()])
        ->assertRedirect(route('student.login'))
        ->assertSessionHas(
            'status',
            'Registration successful. Your COR is awaiting ICT Admin approval.',
        );

    $this->get(route('student.login'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('auth/student-login'));

    $user = User::where('email', 'student@8.ustp.edu.ph')->first();

    expect($user)->not->toBeNull()
        ->and($user->status)->toBe('active')
        ->and($user->email_verified_at)->not->toBeNull()
        ->and($user->is_approved)->toBeFalse()
        ->and($user->approval_status)->toBe('pending')
        ->and($user->role->role_name)->toBe('student')
        ->and($user->department)->toBe('BSIT')
        ->and($user->name)->toBe('Juan S. Dela Cruz')
        ->and($user->educational_level)->toBe('college')
        ->and($user->year_level)->toBe('1');

    $verification = $user->studentVerification;

    expect($verification)->not->toBeNull()
        ->and($verification->cor_file_path)->not->toBeNull()
        ->and($verification->student_id_file_path)->toBeNull()
        ->and($user->id_number)->toBe('2023303709')
        ->and($user->approval_status)->toBe('pending');
});

test('a student must wait for administrator approval before signing in', function () {
    Role::firstOrCreate(['role_name' => 'student'], ['description' => 'Students']);
    fakeBrevoMail();

    $this->post(route('register.store'), studentRegistrationPayload());
    $this->post(route('register.otp.verify'), ['code' => registrationOtpCode()]);

    $this->post(route('student.authenticate'), [
        'email' => 'student@8.ustp.edu.ph',
        'password' => 'password',
    ])->assertSessionHasErrors('email');
    $this->assertGuest();

    $student = User::where('email', 'student@8.ustp.edu.ph')->firstOrFail();
    $student->forceFill(['approval_status' => 'approved'])->save();

    $this->post(route('student.authenticate'), [
        'email' => 'student@8.ustp.edu.ph',
        'password' => 'password',
    ])->assertRedirect(route('dashboard'));
    $this->assertAuthenticatedAs($student->fresh());
});

test('a student can register with their id number without a roster entry', function () {
    Role::firstOrCreate(['role_name' => 'student']);
    fakeBrevoMail();

    $this->post(route('register.store'), studentRegistrationPayload([
        'email' => 'unknown@8.ustp.edu.ph',
    ]))->assertRedirect(route('register.otp.show'));

    $this->post(route('register.otp.verify'), ['code' => registrationOtpCode()])
        ->assertRedirect(route('student.login'));

    $student = User::where('email', 'unknown@8.ustp.edu.ph')->firstOrFail();
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

    expect(User::where('email', 'student@8.ustp.edu.ph')->sole()->department)->toBe('BAT');
});

test('a student registration with an invalid department is rejected', function () {
    fakeBrevoMail();

    $this->post(route('register.store'), studentRegistrationPayload([
        'department' => 'CITC',
    ]))->assertSessionHasErrors('department');

    Http::assertNothingSent();
});

test('a student registration without a department is rejected', function () {
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
    expect(User::where('email', 'test@ustp.edu.ph')->exists())->toBeFalse();
});

test('a faculty registration without an employment type is rejected', function () {
    fakeBrevoMail();

    $this->post(route('register.store'), registrationPayload([
        'employment_type' => null,
    ]))->assertSessionHasErrors('employment_type');

    Http::assertNothingSent();
    expect(User::where('email', 'test@ustp.edu.ph')->exists())->toBeFalse();
});

test('a teaching faculty registration requires a department', function () {
    fakeBrevoMail();

    $this->post(route('register.store'), registrationPayload([
        'employment_type' => 'teaching',
        'department' => null,
    ]))->assertSessionHasErrors('department');

    Http::assertNothingSent();
    expect(User::where('email', 'test@ustp.edu.ph')->exists())->toBeFalse();
});

test('a teaching faculty registration is stored with their department', function () {
    fakeBrevoMail();

    $this->post(route('register.store'), registrationPayload([
        'employment_type' => 'teaching',
        'department' => 'Department of Information Technology',
    ]))->assertRedirect(route('register.otp.show'));

    $this->post(route('register.otp.verify'), ['code' => registrationOtpCode()])
        ->assertRedirect(route('dashboard'));

    $user = User::where('email', 'test@ustp.edu.ph')->first();

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
        ->assertRedirect(route('dashboard'));

    $user = User::where('email', 'test@ustp.edu.ph')->first();

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
            ->where('email', 'test@ustp.edu.ph'));
});

test('the OTP page redirects to registration without a pending session', function () {
    $this->get(route('register.otp.show'))->assertRedirect(route('register'));
});

test('a correct OTP creates the account', function () {
    fakeBrevoMail();

    $this->post(route('register.store'), registrationPayload());
    $code = registrationOtpCode();

    $this->post(route('register.otp.verify'), ['code' => $code])
        ->assertRedirect(route('dashboard'))
        ->assertSessionHas('status');

    $user = User::where('email', 'test@ustp.edu.ph')->first();

    expect($user)->not->toBeNull()
        ->and($user->status)->toBe('active')
        ->and($user->email_verified_at)->not->toBeNull()
        ->and(cache(RegistrationOtpService::key('test@ustp.edu.ph')))->toBeNull()
        ->and(session('registration_otp_email'))->toBeNull();
});

test('faculty registrations store their employee ID number', function () {
    fakeBrevoMail();
    Role::firstOrCreate(['role_name' => 'faculty']);

    $this->post(route('register.store'), registrationPayload(['id_number' => 'EMP-1001']));
    $this->post(route('register.otp.verify'), ['code' => registrationOtpCode()]);

    $user = User::where('email', 'test@ustp.edu.ph')->sole();

    expect($user->id_number)->toBe('EMP-1001');
    $this->assertDatabaseHas('faculty_profiles', [
        'user_id' => $user->id,
        'id_number' => 'EMP-1001',
    ]);
});

test('faculty ID numbers must be unique', function () {
    fakeBrevoMail();
    $role = Role::firstOrCreate(['role_name' => 'faculty']);
    User::factory()->create(['role_id' => $role->id, 'id_number' => 'EMP-1001']);

    $this->post(route('register.store'), registrationPayload(['id_number' => 'EMP-1001']))
        ->assertSessionHasErrors('id_number');
});

test('an incorrect OTP is rejected but the account can still be created', function () {
    fakeBrevoMail();

    $this->post(route('register.store'), registrationPayload());
    $code = registrationOtpCode();

    $this->post(route('register.otp.verify'), ['code' => '000000'])
        ->assertSessionHasErrors('code');

    expect(User::where('email', 'test@ustp.edu.ph')->exists())->toBeFalse();

    $this->post(route('register.otp.verify'), ['code' => $code])
        ->assertRedirect(route('dashboard'));

    expect(User::where('email', 'test@ustp.edu.ph')->exists())->toBeTrue();
});

test('an expired OTP cannot be verified', function () {
    fakeBrevoMail();

    $this->post(route('register.store'), registrationPayload());
    $code = registrationOtpCode();

    $this->travel(RegistrationOtpService::EXPIRY_MINUTES + 1)->minutes();

    $this->post(route('register.otp.verify'), ['code' => $code])
        ->assertSessionHasErrors('email');

    expect(User::where('email', 'test@ustp.edu.ph')->exists())->toBeFalse();
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

    expect(User::where('email', 'test@ustp.edu.ph')->exists())->toBeFalse();
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
        ->assertRedirect(route('dashboard'));
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

    expect(User::where('email', 'test@ustp.edu.ph')->exists())->toBeFalse();
});

test('registration validation failures do not send an OTP', function () {
    fakeBrevoMail();

    $this->post(route('register.store'), registrationPayload([
        'password_confirmation' => 'mismatched',
    ]))->assertSessionHasErrors('password');

    Http::assertNothingSent();
    expect(User::where('email', 'test@ustp.edu.ph')->exists())->toBeFalse();
});

test('registering requires agreeing to the terms and privacy policy', function () {
    fakeBrevoMail();

    $this->post(route('register.store'), registrationPayload([
        'terms' => null,
    ]))->assertSessionHasErrors('terms');

    Http::assertNothingSent();
    expect(User::where('email', 'test@ustp.edu.ph')->exists())->toBeFalse();
});

test('student registration requires a Certificate of Registration upload', function () {
    fakeBrevoMail();
    Role::firstOrCreate(['role_name' => 'student']);

    $this->post(route('register.store'), studentRegistrationPayload(['cor' => null]))
        ->assertSessionHasErrors(['cor' => 'Please upload your Certificate of Registration (COR)']);

    Http::assertNothingSent();
    expect(User::where('email', 'student@8.ustp.edu.ph')->exists())->toBeFalse();
});

test('student registration stores the ID number after OTP verification', function () {
    fakeBrevoMail();
    Role::firstOrCreate(['role_name' => 'student']);

    $this->post(route('register.store'), studentRegistrationPayload(['id_number' => '2023000123']))
        ->assertRedirect(route('register.otp.show'));

    $this->post(route('register.otp.verify'), ['code' => registrationOtpCode()]);

    $user = User::where('email', 'student@8.ustp.edu.ph')->sole();

    expect($user->studentVerification->cor_file_path)->not->toBeNull()
        ->and($user->id_number)->toBe('2023000123')
        ->and($user->studentVerification->student_id_file_path)->toBeNull();
});

test('registration rejects a COR upload that is not a real PDF', function () {
    fakeBrevoMail();
    $this->post(route('register.store'), studentRegistrationPayload([
        'cor' => UploadedFile::fake()->createWithContent('cor.pdf', 'plain text, not a pdf'),
    ]))->assertSessionHasErrors(['cor' => 'The uploaded file content is not a supported document.']);

    Http::assertNothingSent();
});

test('registration accepts a COR image upload', function () {
    fakeBrevoMail();

    $this->post(route('register.store'), studentRegistrationPayload([
        'cor' => fakeCorImageUpload(),
    ]))->assertSessionHasNoErrors()->assertRedirect(route('register.otp.show'));
});

test('registration no longer accepts student ID attachments', function () {
    fakeBrevoMail();
    $this->post(route('register.store'), studentRegistrationPayload([
        'student_id' => fakeStudentIdUpload(),
    ]))->assertSessionHasErrors('student_id');

    Http::assertNothingSent();
});

test('student registration validates the ID number', function (?string $idNumber) {
    fakeBrevoMail();

    $this->post(route('register.store'), studentRegistrationPayload(['id_number' => $idNumber]))
        ->assertSessionHasErrors('id_number');

    Http::assertNothingSent();
})->with([null, '', 'student-123', '123456789012345678901']);

test('student registration rejects an ID number already assigned to another account', function () {
    fakeBrevoMail();
    $studentRole = Role::firstOrCreate(['role_name' => 'student']);
    User::factory()->create([
        'role_id' => $studentRole->id,
        'id_number' => '2023303709',
    ]);

    $this->post(route('register.store'), studentRegistrationPayload())
        ->assertSessionHasErrors('id_number');

    Http::assertNothingSent();
});

test('re-registering the same email replaces the staged documents', function () {
    fakeBrevoMail();
    Role::firstOrCreate(['role_name' => 'student']);
    $email = 'restage@8.ustp.edu.ph';

    Storage::disk('local')->put(
        CreateNewUser::pendingUploadDirectory($email).'/cor',
        'stale file',
    );

    $this->post(route('register.store'), studentRegistrationPayload(['email' => $email]));

    expect(Storage::disk('local')->get(CreateNewUser::pendingUploadDirectory($email).'/cor'))
        ->toBe('%PDF-1.4 test certificate of registration');
});
