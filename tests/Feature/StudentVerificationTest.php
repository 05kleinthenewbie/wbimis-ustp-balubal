<?php

use App\Models\Role;
use App\Models\StudentVerification;
use App\Models\User;
use App\Services\StudentVerification\CorParser;
use App\Services\StudentVerification\NameNormalizer;
use App\Services\StudentVerification\ProgramCatalog;
use App\Services\StudentVerification\QrPayloadParser;
use App\Services\StudentVerification\StudentIdQrDecoder;
use App\Services\StudentVerification\VerificationEngine;
use BaconQrCode\Common\ErrorCorrectionLevel;
use BaconQrCode\Encoder\Encoder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia as Assert;

function syntheticIdPng(?string $payload = 'ALEX MORGAN B. TESTER 2099001234BSIT'): string
{
    $matrix = Encoder::encode($payload ?? '', ErrorCorrectionLevel::M())->getMatrix();
    $modules = $matrix->getWidth();
    $size = ($modules + 8) * 5;
    $raw = '';
    for ($y = 0; $y < $size; $y++) {
        $raw .= "\0";
        for ($x = 0; $x < $size; $x++) {
            $mx = intdiv($x, 5) - 4;
            $my = intdiv($y, 5) - 4;
            $black = $payload !== null && $mx >= 0 && $my >= 0 && $mx < $modules && $my < $modules && $matrix->get($mx, $my) === 1;
            $raw .= $black ? "\0" : "\xff";
        }
    }
    $chunk = fn (string $type, string $bytes): string => pack('N', strlen($bytes)).$type.$bytes.pack('H*', hash('crc32b', $type.$bytes));

    return "\x89PNG\r\n\x1a\n".$chunk('IHDR', pack('NNCCCCC', $size, $size, 8, 0, 0, 0, 0)).$chunk('IDAT', gzcompress($raw)).$chunk('IEND', '');
}

function syntheticCorPdf(?string $content = null): string
{
    $lines = explode("\n", $content ?? "University of Science and Technology of Southern Philippines\nCERTIFICATE OF REGISTRATION\nName: TESTER, Alex Morgan B\nStudent No: 2099001234\nProgram: Bachelor of Science in Information Technology\nAcademic Year: 2099-2100\n1st Semester");
    $stream = 'BT /F1 12 Tf 50 750 Td ';
    foreach ($lines as $line) {
        $stream .= '('.str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $line).") Tj 0 -20 Td\n";
    }
    $stream .= 'ET';
    $objects = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        '<< /Length '.strlen($stream).">>\nstream\n".$stream."\nendstream",
    ];
    $pdf = "%PDF-1.4\n";
    $offsets = [];
    foreach ($objects as $index => $object) {
        $offsets[] = strlen($pdf);
        $pdf .= ($index + 1)." 0 obj\n".$object."\nendobj\n";
    }
    $start = strlen($pdf);
    $pdf .= "xref\n0 6\n0000000000 65535 f \n";
    foreach ($offsets as $offset) {
        $pdf .= sprintf("%010d 00000 n \n", $offset);
    }

    return $pdf."trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n".$start."\n%%EOF";
}

function syntheticEvidence(): array
{
    return [
        'email' => 'alex@ustp.edu.ph', 'email_verified' => true,
        'student_id' => ['decoded' => true, 'payload' => ['name' => 'ALEX MORGAN B. TESTER', 'student_number' => '2099001234', 'course' => 'BSIT']],
        'cor' => ['parsed' => true, 'name' => 'TESTER, Alex Morgan B', 'student_number' => '2099001234', 'course_code' => 'BSIT'],
    ];
}

beforeEach(function () {
    Storage::fake('local');
    fakeBrevoMail();
    config()->set('student-verification.ocr.enabled', false);
    $this->studentRole = Role::firstOrCreate(['role_name' => 'student']);
    $this->adminRole = Role::firstOrCreate(['role_name' => 'ict_admin']);
    $this->student = User::factory()->pendingApproval()->create(['role_id' => $this->studentRole->id]);
    $this->admin = User::factory()->create(['role_id' => $this->adminRole->id]);
});

test('institutional email points require exact domain and ownership', function (string $email, bool $verified, int $points) {
    $evidence = syntheticEvidence();
    $evidence['email'] = $email;
    $evidence['email_verified'] = $verified;
    expect(app(VerificationEngine::class)->evaluate($evidence)['email_domain']['points'])->toBe($points);
})->with([
    ['alex@ustp.edu.ph', true, 10], ['alex@USTP.EDU.PH', true, 10], ['alex@ustp.edu.ph', false, 0],
    ['alex@gmail.com', true, 0], ['alex@8.ustp.edu.ph', true, 0], ['alex@9.ustp.edu.ph', true, 0],
    ['alex@ustp.edu.ph.evil.test', true, 0], ['alex@fakeustp.edu.ph', true, 0],
]);

test('students can register with personal emails and must verify OTP', function () {
    $this->post(route('register.store'), studentRegistrationPayload(['email' => 'synthetic@gmail.com']))->assertRedirect(route('register.otp.show'));
    expect(User::where('email', 'synthetic@gmail.com')->exists())->toBeFalse();
    $this->post(route('register.otp.verify'), ['code' => registrationOtpCode()])->assertRedirect(route('student.login'));
    $user = User::where('email', 'synthetic@gmail.com')->sole();
    expect($user->approval_status)->toBe('pending')->and($user->email_verified_at)->not->toBeNull();
});

test('real synthetic QR image is decoded and parsed', function () {
    $decoded = app(StudentIdQrDecoder::class)->decode(syntheticIdPng());
    expect($decoded['decoded'])->toBeTrue()->and($decoded['payload']['student_number'])->toBe('2099001234');
});

test('QR payloads reject malformed numbers', function (string $payload) {
    expect(app(QrPayloadParser::class)->parse($payload))->toBeNull();
})->with(['', 'not a student', 'ALEX TESTER 123BSIT', 'ALEX TESTER 12099001234BSIT']);

test('unknown courses are flagged rather than accepted for matching', function () {
    $evidence = syntheticEvidence();
    $evidence['student_id']['payload']['course'] = 'UNKNOWN';
    $result = app(VerificationEngine::class)->evaluate($evidence);
    expect($result['flags'])->toContain('unknown_program')->and($result['course_match']['points'])->toBe(0);
});

test('missing QR and malformed images are recoverable', function () {
    expect(app(StudentIdQrDecoder::class)->decode('not an image')['decoded'])->toBeFalse();
    expect(app(StudentIdQrDecoder::class)->decode(syntheticIdPng(null))['error'])->toBe('qr_not_found');
    expect(app(StudentIdQrDecoder::class)->decode(syntheticIdPng('NOT A STUDENT'))['error'])->toBe('qr_payload_unrecognized');
});

test('COR PDF text is extracted with required fields', function () {
    $result = app(CorParser::class)->parse(syntheticCorPdf());
    expect($result['parsed'])->toBeTrue()->and($result['student_number'])->toBe('2099001234')->and($result['course_code'])->toBe('BSIT')->and($result['semester'])->toBe('1st Semester');
});

test('missing COR fields and malformed PDFs fail gracefully', function () {
    expect(app(CorParser::class)->parse('not a PDF')['parsed'])->toBeFalse()
        ->and(app(CorParser::class)->parse(syntheticCorPdf('University of Science and Technology '.str_repeat('missing fields ', 10)))['parsed'])->toBeFalse();
});

test('configured academic term requirements are enforced', function () {
    config()->set('student-verification.enrollment.required_academic_year', '2098-2099');
    $result = app(CorParser::class)->parse(syntheticCorPdf());
    expect($result['parsed'])->toBeFalse()->and($result['flags'])->toContain('invalid_academic_term');
});

test('scanned PDF attempts local rasterization and OCR fallback', function () {
    config()->set('student-verification.ocr.enabled', true);
    Process::fake([
        '*pdftoppm*' => Process::result(),
        '*tesseract*' => Process::result(output: "University of Science and Technology of Southern Philippines\nName: TESTER, Alex Morgan B\nStudent No: 2099001234\nProgram: BSIT\nAcademic Year: 2099-2100\n1st Semester"),
    ]);
    $result = app(CorParser::class)->parse(syntheticCorPdf(''));
    expect($result['parsed'])->toBeTrue()->and($result['text_source'])->toBe('ocr');
});

test('name matching handles order and consistent middle initials conservatively', function (string $left, string $right, string $result) {
    expect(NameNormalizer::compare($left, $right))->toBe($result);
})->with([
    ['ALEX MORGAN B. TESTER', 'TESTER, Alex Morgan B', 'match'],
    ['ALEX B TESTER', 'TESTER, Alex Bernard', 'match'],
    ['ALEX B TESTER', 'TESTER, Alex C', 'mismatch'],
    ['ALEX TESTER', 'OTHER, Alex', 'mismatch'],
]);

test('all four programs normalize to canonical codes', function (string $code, string $name) {
    expect(app(ProgramCatalog::class)->normalize($name))->toBe($code)->and(app(ProgramCatalog::class)->normalize($code))->toBe($code);
    $evidence = syntheticEvidence();
    $evidence['student_id']['payload']['course'] = $code;
    $evidence['cor']['course_code'] = app(ProgramCatalog::class)->normalize($name);
    expect(app(VerificationEngine::class)->evaluate($evidence)['course_match']['points'])->toBe(5);
})->with([
    ['BSIT', 'Bachelor of Science in Information Technology'], ['BTLED', 'Bachelor of Technology and Livelihood Education'],
    ['BAT', 'Bachelor of Agricultural Technology'], ['BSA', 'Bachelor of Science in Agriculture'],
]);

test('maximum score is forty and mismatches remain flagged', function () {
    $evidence = syntheticEvidence();
    expect(app(VerificationEngine::class)->evaluate($evidence)['score'])->toBe(40);
    $evidence['cor']['student_number'] = '2099009999';
    $result = app(VerificationEngine::class)->evaluate($evidence);
    expect($result['score'])->toBe(30)->and($result['recommendation'])->toBe('manual_review')->and($result['flags'])->toContain('student_number_mismatch');
    $evidence['cor'] = null;
    $result = app(VerificationEngine::class)->evaluate($evidence);
    expect($result['student_number_match']['points'])->toBe(0)->and($result['name_match']['points'])->toBe(0)->and($result['course_match']['points'])->toBe(0);
});

test('pending and rejected student sessions cannot access protected functionality', function (string $state) {
    $this->student->forceFill(['approval_status' => $state, 'is_approved' => true])->save();
    $this->actingAs($this->student)->get(route('dashboard'))->assertRedirect(route('student.verification.show'));
    $this->get(route('student.verification.show'))->assertOk()->assertInertia(fn (Assert $page) => $page->component('student/verification'));
})->with(['pending', 'rejected']);

test('pending students can sign in to verification', function () {
    $this->post(route('student.authenticate'), ['email' => $this->student->email, 'password' => 'password'])->assertRedirect(route('student.verification.show'));
    $this->assertAuthenticatedAs($this->student);
});

test('uploads are private backend scored and require ownership verification', function () {
    $this->actingAs($this->student)->post(route('student.verification.store'), [
        'student_id' => UploadedFile::fake()->createWithContent('id.png', syntheticIdPng()),
        'cor' => UploadedFile::fake()->createWithContent('cor.pdf', syntheticCorPdf()),
        'verification_score' => 999, 'approval_status' => 'approved',
    ])->assertSessionHasNoErrors()->assertRedirect();
    $verification = $this->student->fresh()->studentVerification;
    expect($verification->verification_score)->toBe(30)->and($this->student->fresh()->approval_status)->toBe('pending');
    Storage::disk('local')->assertExists($verification->student_id_file_path);
    $this->get(route('student.verification.document', 'cor'))->assertOk()->assertHeader('Cache-Control', 'no-store, private');
    $other = User::factory()->create(['role_id' => $this->studentRole->id]);
    $this->actingAs($other)->get(route('students.document', [$this->student, 'cor']))->assertForbidden();
});

test('spoofed uploads are rejected', function () {
    $this->actingAs($this->student)->post(route('student.verification.store'), ['student_id' => UploadedFile::fake()->createWithContent('id.png', 'not image'), 'cor' => UploadedFile::fake()->createWithContent('cor.pdf', 'not PDF')])->assertSessionHasErrors(['student_id', 'cor']);
});

test('only administrators decide and revocation affects existing sessions', function () {
    $verification = new StudentVerification;
    $verification->forceFill(['user_id' => $this->student->id, 'student_number' => '2099001234', 'student_id_file_path' => 'id.png', 'cor_file_path' => 'cor.pdf'])->save();
    $this->actingAs($this->student)->patch(route('students.decision', $this->student), ['decision' => 'approved'])->assertRedirect(route('student.verification.show'));
    $this->actingAs($this->admin)->patch(route('students.decision', $this->student), ['decision' => 'approved'])->assertSessionHasNoErrors();
    expect($this->student->fresh()->approval_status)->toBe('approved');
    $this->actingAs($this->student->fresh())->get(route('dashboard'))->assertOk();
    $this->actingAs($this->admin)->patch(route('students.decision', $this->student), ['decision' => 'rejected', 'reason' => 'Synthetic review reason'])->assertSessionHasNoErrors();
    $this->actingAs($this->student->fresh())->get(route('dashboard'))->assertRedirect(route('student.verification.show'));
});

test('generic approval endpoint cannot bypass student documents', function () {
    $this->actingAs($this->admin)->patch(route('users.approve', $this->student))->assertSessionHasErrors('approve');
});

test('duplicate approved student identities are blocked', function () {
    $first = new StudentVerification;
    $first->forceFill(['user_id' => $this->student->id, 'student_number' => '2099001234', 'approved_student_number' => '2099001234'])->save();
    $other = User::factory()->pendingApproval()->create(['role_id' => $this->studentRole->id]);
    $second = new StudentVerification;
    $second->forceFill(['user_id' => $other->id, 'student_number' => '2099001234', 'student_id_file_path' => 'id.png', 'cor_file_path' => 'cor.pdf'])->save();
    $this->actingAs($this->admin)->patch(route('students.decision', $other), ['decision' => 'approved'])->assertSessionHasErrors('decision');
});

test('unverified students cannot submit documents and signed ownership verification is bound to the account', function () {
    $this->student->forceFill(['email_verified_at' => null])->save();
    $this->actingAs($this->student)->post(route('student.verification.store'))->assertForbidden();
    $this->post(route('student.verification.send-email'))->assertRedirect();
    $url = URL::temporarySignedRoute('student.verification.verify-email', now()->addMinutes(30), ['id' => $this->student->id, 'hash' => sha1($this->student->email)]);
    $other = User::factory()->pendingApproval()->create(['role_id' => $this->studentRole->id]);
    $this->actingAs($other)->get($url)->assertForbidden();
    $this->actingAs($this->student)->get($url)->assertRedirect(route('student.verification.show'));
    expect($this->student->fresh()->email_verified_at)->not->toBeNull();
});

test('rejection requires feedback and resubmission returns an application to pending', function () {
    $this->actingAs($this->admin)->patch(route('students.decision', $this->student), ['decision' => 'rejected'])->assertSessionHasErrors('reason');
    $this->patch(route('students.decision', $this->student), ['decision' => 'rejected', 'reason' => 'Please upload clearer evidence.'])->assertSessionHasNoErrors();
    $this->actingAs($this->student->fresh())->post(route('student.verification.store'), [
        'student_id' => UploadedFile::fake()->createWithContent('id.png', syntheticIdPng()),
        'cor' => UploadedFile::fake()->createWithContent('cor.pdf', syntheticCorPdf()),
    ])->assertSessionHasNoErrors();
    expect($this->student->fresh()->approval_status)->toBe('pending')->and($this->student->fresh()->studentVerification->review_notes)->toBeNull();
});

test('student queue filters status and sorts by verification score', function () {
    $other = User::factory()->pendingApproval()->create(['role_id' => $this->studentRole->id]);
    foreach ([[$this->student, 10], [$other, 35]] as [$user, $score]) {
        $verification = new StudentVerification;
        $verification->forceFill(['user_id' => $user->id, 'verification_score' => $score])->save();
    }
    $this->actingAs($this->admin)->get(route('students.approvals'))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('students/approvals')->where('applications.data.0.id', $other->id)->has('applications.data', 2));
});

test('evidence retention removes private files without deleting approved accounts or identity claims', function () {
    $this->student->forceFill(['approval_status' => 'approved'])->save();
    Storage::disk('local')->put('expired-id.png', syntheticIdPng());
    Storage::disk('local')->put('expired-cor.pdf', syntheticCorPdf());
    $verification = new StudentVerification;
    $verification->forceFill(['user_id' => $this->student->id, 'student_number' => '2099001234', 'approved_student_number' => '2099001234', 'student_id_file_path' => 'expired-id.png', 'cor_file_path' => 'expired-cor.pdf', 'verified_at' => now()->subDays(800)])->save();
    $this->artisan('students:prune-documents')->assertSuccessful();
    Storage::disk('local')->assertMissing('expired-id.png');
    expect($verification->fresh()->approved_student_number)->toBe('2099001234')->and($verification->fresh()->verification_score)->toBe(0)->and($this->student->fresh()->approval_status)->toBe('approved');
});

test('existing approved students survive the additive approval migration', function () {
    $approved = User::factory()->create(['role_id' => $this->studentRole->id]);
    $migration = require database_path('migrations/2026_11_06_170000_add_approval_status_to_users_table.php');
    $migration->down();
    $migration->up();
    expect($approved->fresh()->approval_status)->toBe('approved')->and($this->student->fresh()->approval_status)->toBe('pending');
    expect(Schema::hasTable('student_verification_logs'))->toBeTrue();
});

test('course disagreements and unsupported COR programs cannot earn program points', function () {
    $evidence = syntheticEvidence();
    $evidence['cor']['course_code'] = 'BAT';
    expect(app(VerificationEngine::class)->evaluate($evidence)['flags'])->toContain('program_mismatch');
    expect(app(ProgramCatalog::class)->normalize('Bachelor of Science in Computer Science'))->toBeNull();
});

test('approved students cannot overwrite approved evidence', function () {
    $this->student->forceFill(['approval_status' => 'approved'])->save();
    $this->actingAs($this->student)->post(route('student.verification.store'))->assertForbidden();
});
