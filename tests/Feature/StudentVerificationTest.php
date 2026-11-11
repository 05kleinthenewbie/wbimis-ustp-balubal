<?php

use App\Actions\Fortify\CreateNewUser;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    fakeBrevoMail();
    $this->studentRole = Role::firstOrCreate(['role_name' => 'student']);
    $this->adminRole = Role::firstOrCreate(['role_name' => 'ict_admin']);
    $this->student = User::factory()->pendingApproval()->create(['role_id' => $this->studentRole->id]);
    $this->admin = User::factory()->create(['role_id' => $this->adminRole->id]);
});

test('registering students upload their COR for manual review', function () {
    fakeBrevoMail();

    $this->post(route('register.store'), studentRegistrationPayload())
        ->assertRedirect(route('register.otp.show'));

    $this->post(route('register.otp.verify'), ['code' => registrationOtpCode()])
        ->assertRedirect(route('student.login'));

    $user = User::where('email', 'student@8.ustp.edu.ph')->sole();
    $verification = $user->studentVerification;

    expect($user->approval_status)->toBe('pending')
        ->and($user->email_verified_at)->not->toBeNull()
        ->and($verification)->not->toBeNull()
        ->and($verification->cor_file_path)->not->toBeNull()
        ->and($verification->reviewed_at)->toBeNull();

    Storage::disk('local')->assertExists($verification->cor_file_path);

    $staged = CreateNewUser::pendingUploadDirectory('student@8.ustp.edu.ph');

    Storage::disk('local')->assertMissing($staged);
});

test('registration stages documents before the OTP and replaces stale copies', function () {
    fakeBrevoMail();
    $email = 'student@8.ustp.edu.ph';

    Storage::disk('local')->put(
        CreateNewUser::pendingUploadDirectory($email).'/cor',
        'stale registration',
    );

    $this->post(route('register.store'), studentRegistrationPayload(['student_id' => null]));

    expect(Storage::disk('local')->get(CreateNewUser::pendingUploadDirectory($email).'/cor'))
        ->toBe('%PDF-1.4 test certificate of registration');
});

test('pending and rejected student sessions cannot access protected functionality', function (string $state) {
    $this->student->forceFill(['approval_status' => $state])->save();
    $this->actingAs($this->student)->get(route('dashboard'))->assertRedirect(route('student.verification.show'));
    $this->get(route('student.verification.show'))->assertOk()->assertInertia(fn (Assert $page) => $page->component('student/verification'));
})->with(['pending', 'rejected']);

test('pending students cannot sign in until an administrator approves them', function () {
    $this->post(route('student.authenticate'), ['email' => $this->student->email, 'password' => 'password'])
        ->assertSessionHasErrors('email');
    $this->assertGuest();

    $this->student->forceFill(['approval_status' => 'approved'])->save();

    $this->post(route('student.authenticate'), ['email' => $this->student->email, 'password' => 'password'])
        ->assertRedirect(route('dashboard'));
    $this->assertAuthenticatedAs($this->student->fresh());
});

test('rejected students cannot sign in', function () {
    $this->student->forceFill(['approval_status' => 'rejected'])->save();

    $this->post(route('student.authenticate'), ['email' => $this->student->email, 'password' => 'password'])
        ->assertSessionHasErrors('email');
    $this->assertGuest();
});

test('students upload documents for review and cannot forge decision state', function () {
    $this->actingAs($this->student)->post(route('student.verification.store'), [
        'cor' => fakeCorUpload(),
        'student_id' => fakeStudentIdUpload(),
        'approval_status' => 'approved',
        'review_notes' => 'self approved',
    ])->assertSessionHasNoErrors()->assertRedirect();

    $verification = $this->student->fresh()->studentVerification;

    expect($verification->cor_file_path)->not->toBeNull()
        ->and($verification->student_id_file_path)->not->toBeNull()
        ->and($verification->review_notes)->toBeNull()
        ->and($verification->reviewed_by)->toBeNull()
        ->and($this->student->fresh()->approval_status)->toBe('pending')
        ->and($this->student->fresh()->is_approved)->toBeFalse();

    Storage::disk('local')->assertExists($verification->cor_file_path)
        ->assertExists($verification->student_id_file_path);
});

test('documents stay private and only their owner reads them', function () {
    $this->actingAs($this->student)->post(route('student.verification.store'), [
        'cor' => fakeCorUpload(),
        'student_id' => fakeStudentIdUpload(),
    ])->assertSessionHasNoErrors();

    $this->get(route('student.verification.document', 'cor'))->assertOk()->assertHeader('Cache-Control', 'no-store, private');
    $other = User::factory()->pendingApproval()->create(['role_id' => $this->studentRole->id]);
    $this->actingAs($this->admin)->get(route('students.document', [$this->student, 'cor']))->assertOk();
    $other->forceFill(['approval_status' => 'approved', 'is_approved' => true])->save();
    $this->actingAs($other)->get(route('students.document', [$this->student, 'cor']))->assertForbidden();
});

test('replacing documents keeps untouched files and swaps the rest', function () {
    $this->actingAs($this->student)->post(route('student.verification.store'), ['cor' => fakeCorUpload()])
        ->assertSessionHasNoErrors();
    $first = $this->student->fresh()->studentVerification->cor_file_path;

    $this->actingAs($this->student)->post(route('student.verification.store'), ['student_id' => fakeStudentIdUpload()])
        ->assertSessionHasNoErrors();

    $second = $this->student->fresh()->studentVerification;

    expect($second->cor_file_path)->toBe($first)
        ->and($second->student_id_file_path)->not->toBeNull();

    Storage::disk('local')->assertExists($first);
});

test('at least one document must be submitted', function () {
    $this->actingAs($this->student)->post(route('student.verification.store'), [])
        ->assertSessionHasErrors('cor');
});

test('students can submit a COR image for review', function () {
    $this->actingAs($this->student)->post(route('student.verification.store'), [
        'cor' => fakeCorImageUpload(),
    ])->assertSessionHasNoErrors();

    $verification = $this->student->fresh()->studentVerification;

    expect($verification->cor_file_path)->not->toBeNull()
        ->and($verification->user->approval_status)->toBe('pending');
});

test('replacing a COR removes the old copy and preserves the new upload', function () {
    $this->actingAs($this->student)->post(route('student.verification.store'), ['cor' => fakeCorUpload()])
        ->assertSessionHasNoErrors();
    $oldPath = $this->student->fresh()->studentVerification->cor_file_path;

    $this->post(route('student.verification.store'), ['cor' => fakeCorUpload('%PDF-1.4 replacement COR')])
        ->assertSessionHasNoErrors();
    $newPath = $this->student->fresh()->studentVerification->cor_file_path;

    expect($newPath)->not->toBe($oldPath);
    Storage::disk('local')->assertMissing($oldPath)->assertExists($newPath);
    expect(Storage::disk('local')->get($newPath))->toBe('%PDF-1.4 replacement COR');
});

test('student review cannot change a faculty account', function () {
    $role = Role::firstOrCreate(['role_name' => 'faculty_staff']);
    $faculty = User::factory()->pendingApproval()->create(['role_id' => $role->id]);

    $this->actingAs($this->admin)->patch(route('students.decision', $faculty), ['decision' => 'approved'])
        ->assertNotFound();

    expect($faculty->fresh()->is_approved)->toBeFalse();
});

test('spoofed uploads are rejected', function () {
    $this->actingAs($this->student)->post(route('student.verification.store'), [
        'student_id' => UploadedFile::fake()->createWithContent('id.png', 'not an image'),
        'cor' => UploadedFile::fake()->createWithContent('cor.pdf', 'not a PDF'),
    ])->assertSessionHasErrors(['student_id', 'cor']);
});

test('only administrators decide and revocation affects existing sessions', function () {
    $this->actingAs($this->student)->post(route('student.verification.store'), [
        'cor' => fakeCorUpload(),
        'student_id' => fakeStudentIdUpload(),
    ])->assertSessionHasNoErrors();
    $verification = $this->student->fresh()->studentVerification;

    $this->actingAs($this->admin)->patch(route('students.decision', $this->student), ['decision' => 'approved'])
        ->assertSessionHasNoErrors()
        ->assertSessionHas('status', 'Student application approved.');

    expect($this->student->fresh()->approval_status)->toBe('approved')
        ->and($this->student->fresh()->is_approved)->toBeTrue()
        ->and($verification->fresh()->reviewed_by)->toBe($this->admin->id)
        ->and($verification->fresh()->review_notes)->toBeNull();

    $this->actingAs($this->student->fresh())->get(route('dashboard'))->assertOk();

    $this->actingAs($this->admin)->patch(route('students.decision', $this->student), ['decision' => 'rejected', 'reason' => 'Documents were unreadable.'])
        ->assertSessionHasNoErrors();

    expect($this->student->fresh()->approval_status)->toBe('rejected')
        ->and($this->student->fresh()->fresh()->studentVerification->review_notes)->toBe('Documents were unreadable.');

    $this->actingAs($this->student->fresh())->get(route('dashboard'))->assertRedirect(route('student.verification.show'));
});

test('students cannot review their own application', function () {
    $this->actingAs($this->student)
        ->patch(route('students.decision', $this->student), ['decision' => 'approved'])
        ->assertRedirect(route('student.verification.show'));

    expect($this->student->fresh()->approval_status)->toBe('pending');
});

test('non-administrators cannot use the bulk decision endpoint', function () {
    $facultyRole = Role::firstOrCreate(['role_name' => 'faculty_staff']);
    $faculty = User::factory()->create(['role_id' => $facultyRole->id]);

    $this->actingAs($faculty)
        ->patch(route('students.bulk-decision'), ['ids' => [$this->student->id], 'decision' => 'approved'])
        ->assertForbidden();

    expect($this->student->fresh()->approval_status)->toBe('pending');
});

test('student approvals through user management record the review decision', function () {
    $this->actingAs($this->admin)
        ->patch(route('users.approve', $this->student))
        ->assertRedirect(route('users.approvals'));

    $student = $this->student->fresh();

    expect($student->approval_status)->toBe('approved')
        ->and($student->studentVerification->reviewed_by)->toBe($this->admin->id)
        ->and($student->studentVerification->reviewed_at)->not->toBeNull()
        ->and($student->systemNotifications()->where('notification_type', 'account_approval')->exists())->toBeTrue();
});

test('the user management approvals queue lists pending students with their COR', function () {
    $this->student->studentVerification()->create([
        'cor_file_path' => 'student-verifications/'.$this->student->id.'/cor.pdf',
    ]);

    $this->actingAs($this->admin)
        ->get(route('users.approvals'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('users/approvals')
            ->where('pendingUsers', fn ($users) => collect($users)->contains(
                fn ($user) => $user['id'] === $this->student->id
                    && $user['is_student'] === true
                    && $user['has_cor'] === true,
            )));
});

test('rejecting a student from user management requires and stores a reason', function () {
    $this->actingAs($this->admin)
        ->patch(route('users.reject', $this->student))
        ->assertSessionHasErrors('reason');

    expect($this->student->fresh()->approval_status)->toBe('pending');

    $this->actingAs($this->admin)
        ->patch(route('users.reject', $this->student), ['reason' => 'The COR is unreadable.'])
        ->assertRedirect(route('users.approvals'));

    expect($this->student->fresh()->approval_status)->toBe('rejected')
        ->and($this->student->fresh()->studentVerification->review_notes)->toBe('The COR is unreadable.');
});

test('rejection requires feedback and resubmission returns an application to pending', function () {
    $this->actingAs($this->admin)->patch(route('students.decision', $this->student), ['decision' => 'rejected'])->assertSessionHasErrors('reason');
    $this->actingAs($this->admin)->patch(route('students.decision', $this->student), ['decision' => 'rejected', 'reason' => 'Please upload clearer evidence.'])->assertSessionHasNoErrors();

    $this->actingAs($this->student->fresh())->post(route('student.verification.store'), [
        'cor' => fakeCorUpload(),
        'student_id' => fakeStudentIdUpload(),
    ])->assertSessionHasNoErrors();

    expect($this->student->fresh()->approval_status)->toBe('pending')
        ->and($this->student->fresh()->is_approved)->toBeFalse()
        ->and($this->student->fresh()->studentVerification->review_notes)->toBeNull();
});

test('administrators can approve and reject student applications in bulk', function () {
    $applications = collect(range(1, 3))->map(fn ($i) => User::factory()->pendingApproval()->create([
        'role_id' => $this->studentRole->id,
        'email' => "bulk{$i}@8.ustp.edu.ph",
    ]));
    [$first, $second, $third] = $applications;

    foreach ($applications as $application) {
        $this->actingAs($application)->post(route('student.verification.store'), ['cor' => fakeCorUpload(), 'student_id' => fakeStudentIdUpload()])->assertSessionHasNoErrors();
    }

    $this->actingAs($this->admin)->patch(route('students.bulk-decision'), [
        'ids' => [$first->id, $second->id],
        'decision' => 'approved',
    ])->assertSessionHas('status', '2 student application(s) approved.');

    expect($first->fresh()->approval_status)->toBe('approved')
        ->and($first->fresh()->is_approved)->toBeTrue()
        ->and($second->fresh()->approval_status)->toBe('approved')
        ->and($third->fresh()->approval_status)->toBe('pending');

    $this->actingAs($this->admin)->patch(route('students.bulk-decision'), [
        'ids' => [$first->id, $third->id],
        'decision' => 'rejected',
    ])->assertSessionHasErrors('reason');

    $this->actingAs($this->admin)->patch(route('students.bulk-decision'), [
        'ids' => [$first->id, $third->id],
        'decision' => 'rejected',
        'reason' => 'Certificate of Registration expired.',
    ])->assertSessionHasNoErrors();

    expect($first->fresh()->approval_status)->toBe('rejected')
        ->and($first->fresh()->is_approved)->toBeFalse()
        ->and($first->fresh()->studentVerification->review_notes)->toBe('Certificate of Registration expired.')
        ->and($third->fresh()->approval_status)->toBe('rejected');

    $this->actingAs($first->fresh())->get(route('dashboard'))->assertRedirect(route('student.verification.show'));
});

test('the student queue lists pending applications and filters by status', function () {
    $approved = User::factory()->create(['role_id' => $this->studentRole->id])->forceFill(['approval_status' => 'approved']);
    $approved->save();
    $rejected = User::factory()->pendingApproval()->create(['role_id' => $this->studentRole->id, 'email' => 'rejected-student@8.ustp.edu.ph'])
        ->forceFill(['approval_status' => 'rejected']);
    $rejected->save();

    $this->actingAs($this->admin)->get(route('students.approvals'))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('students/approvals')->where('applications.data.0.id', $this->student->id)->has('applications.data', 1));

    $this->actingAs($this->admin)->get(route('students.approvals', ['status' => 'approved']))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('applications.data.0.id', $approved->id)->has('applications.data', 1));

    $this->actingAs($this->admin)->get(route('students.approvals', ['status' => 'rejected']))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('applications.data.0.id', $rejected->id));
});

test('unverified students submit documents and signed email verification is bound to the account', function () {
    $this->student->forceFill(['email_verified_at' => null])->save();

    $this->actingAs($this->student)->post(route('student.verification.store'), ['cor' => fakeCorUpload()])
        ->assertSessionHasNoErrors()->assertRedirect();

    $this->actingAs($this->student)->post(route('student.verification.send-email'))->assertRedirect();

    $url = URL::temporarySignedRoute('student.verification.verify-email', now()->addMinutes(30), ['id' => $this->student->id, 'hash' => sha1($this->student->email)]);
    $other = User::factory()->pendingApproval()->create(['role_id' => $this->studentRole->id]);
    $this->actingAs($other)->get($url)->assertForbidden();
    $this->actingAs($this->student)->get($url)->assertRedirect(route('student.verification.show'));

    expect($this->student->fresh()->email_verified_at)->not->toBeNull();
});

test('account approvals survive document retention pruning', function () {
    $this->student->forceFill(['approval_status' => 'approved', 'is_approved' => true])->save();
    $verification = $this->student->studentVerification()->create([
        'student_id_file_path' => 'expired-id.png',
        'cor_file_path' => 'expired-cor.pdf',
    ]);
    $verification->forceFill(['verified_at' => now()->subDays(800)])->save();
    Storage::disk('local')->put('expired-id.png', 'pixels');
    Storage::disk('local')->put('expired-cor.pdf', 'pdf');

    $this->artisan('students:prune-documents')->assertSuccessful();

    Storage::disk('local')->assertMissing('expired-id.png')->assertMissing('expired-cor.pdf');
    expect($verification->fresh()->student_id_file_path)->toBeNull()
        ->and($this->student->fresh()->approval_status)->toBe('approved');
});

test('staged registration uploads are pruned when abandoned', function () {
    $directory = CreateNewUser::pendingUploadDirectory('abandoned@8.ustp.edu.ph');
    Storage::disk('local')->put($directory.'/cor.pdf', 'pdf');

    $this->artisan('students:prune-documents')->assertSuccessful();

    Storage::disk('local')->assertExists($directory.'/cor.pdf');

    touch(Storage::disk('local')->path($directory), now()->subDays(2)->getTimestamp());
    clearstatcache();

    $this->artisan('students:prune-documents')->assertSuccessful();

    Storage::disk('local')->assertMissing($directory.'/cor.pdf');
});

test('student approvals use a single canonical status', function () {
    $approved = User::factory()->create(['role_id' => $this->studentRole->id]);
    expect($approved->fresh()->approval_status)->toBe('approved')->and($this->student->fresh()->approval_status)->toBe('pending');
    expect(Schema::hasColumn('users', 'is_approved'))->toBeFalse()
        ->and($approved->fresh()->is_approved)->toBeTrue()
        ->and($this->student->fresh()->is_approved)->toBeFalse();
    expect(Schema::hasTable('student_verification_logs'))->toBeTrue();
});

test('approved students cannot overwrite approved evidence', function () {
    $this->student->forceFill(['approval_status' => 'approved'])->save();
    $this->actingAs($this->student)->post(route('student.verification.store'), ['cor' => fakeCorUpload()])->assertForbidden();
});
