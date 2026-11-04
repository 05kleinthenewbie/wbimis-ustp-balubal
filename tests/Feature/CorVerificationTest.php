<?php

use App\Events\UserApproved;
use App\Models\AuditLog;
use App\Models\Notification;
use App\Models\Role;
use App\Models\User;
use App\Services\CorVerificationService;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Storage::fake('local');
    Event::fake([UserApproved::class]);
});

function corApplicant(string $role = 'student', string $status = 'pending'): User
{
    return User::factory()->create([
        'role_id' => Role::firstOrCreate(['role_name' => $role])->id,
        'status' => $status,
        'name' => 'Juan Santos Dela Cruz',
        'id_number' => fake()->unique()->numerify('##########'),
        'department' => 'BSIT',
    ]);
}

function corText(User $user): string
{
    return "UNIVERSITY OF SCIENCE AND TECHNOLOGY OF SOUTHERN PHILIPPINES\nCERTIFICATE OF REGISTRATION\nBALUBAL CAMPUS\nAcademic Year/Term: 2nd Semester AY 2020-2021\nStudent No: {$user->id_number}    College: Computing\nName: DELA CRUZ, Juan Santos    Program: Bachelor of Science in Information Technology\nGender: M\n";
}

/** @param array<int, array{0: float, 1: float, 2: string}> $items */
function corPdfFromItems(array $items): string
{
    $stream = "BT /F1 12 Tf\n";
    foreach ($items as [$x, $y, $text]) {
        $escaped = str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $text);
        $stream .= "1 0 0 1 {$x} {$y} Tm ({$escaped}) Tj\n";
    }
    $stream .= 'ET';
    $objects = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        '<< /Length '.strlen($stream).">>\nstream\n{$stream}\nendstream",
    ];
    $pdf = "%PDF-1.4\n";
    $offsets = [];
    foreach ($objects as $index => $object) {
        $offsets[] = strlen($pdf);
        $pdf .= ($index + 1)." 0 obj\n{$object}\nendobj\n";
    }
    $start = strlen($pdf);
    $pdf .= "xref\n0 6\n0000000000 65535 f \n";
    foreach ($offsets as $offset) {
        $pdf .= sprintf("%010d 00000 n \n", $offset);
    }

    return $pdf."trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{$start}\n%%EOF";
}

/** Build a small text PDF to exercise real PDF extraction without personal documents. */
function corPdf(string $text): string
{
    $items = [];
    $y = 780.0;
    foreach (explode("\n", $text) as $line) {
        $items[] = [50.0, $y, $line];
        $y -= 16;
    }

    return corPdfFromItems($items);
}

function corLayoutPdf(User $user, string $program = 'Bachelor of Science in Information Technology'): string
{
    return corPdfFromItems([
        [30, 810, 'University of Science and Technology of Southern Philippines'],
        [150, 780, 'C E R T I F I C A T E  O F  R E G I S T R A T I O N'],
        [278, 760, 'BALUBAL CAMPUS'],
        [30, 730, 'Student No:'], [80, 730, (string) $user->id_number], [230, 730, 'College:'], [270, 730, 'COLLEGE OF INFORMATION TECHNOLOGY AND COMPUTING'],
        [30, 715, 'Name:'], [80, 715, 'DELA CRUZ, Juan Santos'], [230, 715, 'Program:'], [270, 715, $program],
        [30, 700, 'Gender:'], [80, 700, 'M'], [230, 700, 'Year Level:'], [270, 700, '4th Year - Baccalaureate'],
        [30, 685, 'Academic Year/Term:'], [150, 685, '1st Semester AY 2026-2027'],
    ]);
}

function attachCor(User $user, ?string $text = null, ?string $pdf = null): void
{
    $path = "cor/students/{$user->id}.pdf";
    Storage::disk('local')->put($path, $pdf ?? corPdf($text ?? corText($user)));
    $user->update(['cor_path' => $path, 'cor_original_name' => 'cor.pdf']);
}

test('a two-column layout is matched by vertical position and ignores academic term', function () {
    $student = corApplicant();
    attachCor($student, pdf: corLayoutPdf($student));
    app(CorVerificationService::class)->verify($student);

    expect($student->refresh()->cor_verification_status)->toBe('matched')
        ->and($student->cor_verification_details['checks']['program']['actual'])->toBe('Bachelor of Science in Information Technology');
});

test('a real PDF matches reordered names and does not enforce academic term', function () {
    $student = corApplicant();
    attachCor($student);
    app(CorVerificationService::class)->verify($student);

    expect($student->refresh()->cor_verification_status)->toBe('matched')
        ->and($student->cor_checked_at)->not->toBeNull()
        ->and($student->status)->toBe('pending');
});

test('COR checks flag incorrect or absent fields', function (string $original, string $replacement, string $field) {
    $student = corApplicant();
    $text = str_replace($original, $replacement, corText($student));
    attachCor($student, $text);
    app(CorVerificationService::class)->verify($student);

    expect($student->cor_verification_status)->toBe('mismatch')
        ->and($student->cor_verification_details['checks'][$field]['matches'])->toBeFalse();
})->with([
    ['DELA CRUZ, Juan Santos', 'DELA CRUZ, Other Person', 'name'],
    ['Bachelor of Science in Information Technology', 'Bachelor of Science in Agriculture', 'program'],
    ['Student No:', 'Reference:', 'student_id'],
]);

test('COR verification checks exactly name id number and program', function () {
    $student = corApplicant();
    $text = str_replace(
        ['CERTIFICATE OF REGISTRATION', 'BALUBAL CAMPUS', 'Academic Year/Term: 2nd Semester AY 2020-2021', 'Gender: M'],
        ['', 'OTHER CAMPUS', 'Academic Year/Term: any term', 'Gender: F'],
        corText($student),
    );
    attachCor($student, $text);
    app(CorVerificationService::class)->verify($student);

    expect($student->refresh()->cor_verification_status)->toBe('matched')
        ->and(array_keys($student->cor_verification_details['checks']))->toBe(['name', 'student_id', 'program']);
});

test('student IDs can be read from an ID number label', function () {
    $student = corApplicant();
    attachCor($student, str_replace('Student No:', 'ID Number:', corText($student)));
    app(CorVerificationService::class)->verify($student);

    expect($student->refresh()->cor_verification_status)->toBe('matched')
        ->and($student->cor_verification_details['checks']['student_id']['actual'])->toBe($student->id_number);
});

test('text based student ID documents use the same three verification checks', function (string $idLabel, string $programLabel) {
    $student = corApplicant();
    $text = str_replace(
        ['CERTIFICATE OF REGISTRATION', 'Student No:', 'Program:'],
        ['STUDENT IDENTIFICATION CARD', $idLabel, $programLabel],
        corText($student),
    );
    attachCor($student, $text);
    app(CorVerificationService::class)->verify($student);

    expect($student->refresh()->cor_verification_status)->toBe('matched')
        ->and(array_keys($student->cor_verification_details['checks']))->toBe(['name', 'student_id', 'program'])
        ->and($student->approval_block_reason)->toBeNull();
})->with([
    ['Student ID:', 'Course:'],
    ['Student ID Number:', 'Program:'],
    ['ID No.:', 'Course:'],
    ['ID:', 'Program:'],
]);

test('missing damaged image and scanned CORs require manual review', function (string $kind) {
    $student = corApplicant();
    if ($kind !== 'missing') {
        $path = "cor/students/{$student->id}.pdf";
        Storage::disk('local')->put($path, match ($kind) {
            'scanned' => corPdf(''),
            'image' => base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1sAAAAASUVORK5CYII='),
            default => '%PDF-1.4 broken content',
        });
        $student->update(['cor_path' => $path]);
    }
    app(CorVerificationService::class)->verify($student);
    expect($student->cor_verification_status)->toBe('manual_review')
        ->and($student->status)->toBe('pending');
})->with(['missing', 'damaged', 'image', 'scanned']);

test('bulk verification checks selected students and never approves them', function () {
    $admin = corApplicant('ict_admin', 'active');
    $first = corApplicant();
    $second = corApplicant();
    $unselected = corApplicant();
    $faculty = corApplicant('faculty_staff');
    attachCor($first);
    attachCor($second, str_replace('Bachelor of Science in Information Technology', 'Bachelor of Science in Agriculture', corText($second)));

    $this->actingAs($admin)->post(route('users.bulk'), [
        'action' => 'verify', 'ids' => [$first->id, $second->id, $faculty->id],
    ])->assertRedirect()->assertSessionHasNoErrors();

    expect($first->refresh()->cor_verification_status)->toBe('matched')
        ->and($second->refresh()->cor_verification_status)->toBe('mismatch')
        ->and($first->status)->toBe('pending')
        ->and($unselected->refresh()->cor_checked_at)->toBeNull()
        ->and($faculty->refresh()->cor_checked_at)->toBeNull();
    Event::assertNotDispatched(UserApproved::class);

    $this->get(route('users.index'))->assertInertia(fn (Assert $page) => $page
        ->component('users/index')
        ->has('pendingUsers', 4)
        ->where('pendingUsers', fn ($users) => collect($users)->firstWhere('id', $first->id)['cor_verification_status'] === 'matched'));
});

test('bulk approval preserves notifications and audit logs and skips missing CORs mismatches and stale selections', function () {
    $admin = corApplicant('ict_admin', 'active');
    $student = corApplicant();
    $missing = corApplicant();
    $mismatch = corApplicant();
    $inactive = corApplicant('student', 'inactive');
    $faculty = corApplicant('faculty_staff');
    attachCor($student);
    attachCor($mismatch, str_replace('Bachelor of Science in Information Technology', 'Bachelor of Science in Agriculture', corText($mismatch)));
    app(CorVerificationService::class)->verify($mismatch);

    $payload = ['action' => 'approve', 'ids' => [$student->id, $missing->id, $mismatch->id, $inactive->id, $faculty->id]];
    $this->actingAs($admin)->post(route('users.bulk'), $payload)->assertSessionHasNoErrors();
    $this->post(route('users.bulk'), $payload)->assertSessionHasNoErrors();

    expect($student->refresh()->status)->toBe('active')
        ->and($faculty->refresh()->status)->toBe('active')
        ->and($missing->refresh()->status)->toBe('pending')
        ->and($mismatch->refresh()->status)->toBe('pending')
        ->and($inactive->refresh()->status)->toBe('inactive')
        ->and(Notification::where('notification_type', 'account_approval')->count())->toBe(2)
        ->and(AuditLog::where('module_name', 'users')->count())->toBe(2);
    Event::assertDispatchedTimes(UserApproved::class, 2);
});

test('bulk rejection only rejects selected pending accounts', function () {
    $admin = corApplicant('ict_admin', 'active');
    $first = corApplicant();
    $second = corApplicant();
    $active = corApplicant('student', 'active');
    $other = corApplicant();
    $this->actingAs($admin)->post(route('users.bulk'), [
        'action' => 'reject', 'ids' => [$first->id, $second->id, $active->id],
    ])->assertSessionHasNoErrors();
    expect(User::whereKey($first->id)->exists())->toBeFalse()
        ->and(User::whereKey($second->id)->exists())->toBeFalse()
        ->and($active->refresh()->status)->toBe('active')
        ->and($other->refresh()->status)->toBe('pending')
        ->and(Notification::where('notification_type', 'account_rejection')->count())->toBe(0);
});

test('bulk actions require an admin and valid selections', function () {
    $student = corApplicant();
    $this->post(route('users.bulk'), ['action' => 'reject', 'ids' => [$student->id]])->assertRedirect(route('login'));
    $this->actingAs($student)->post(route('users.bulk'), ['action' => 'reject', 'ids' => [$student->id]])->assertForbidden();
    $this->actingAs(corApplicant('ict_admin', 'active'));
    $this->post(route('users.bulk'), ['action' => 'approve', 'ids' => []])->assertSessionHasErrors('ids');
    $this->post(route('users.bulk'), ['action' => 'invalid', 'ids' => [$student->id]])->assertSessionHasErrors('action');
    $this->post(route('users.bulk'), ['action' => 'approve', 'ids' => [$student->id, $student->id]])->assertSessionHasErrors('ids.0');
    $this->post(route('users.bulk'), ['action' => 'approve', 'ids' => [999999]])->assertSessionHasErrors('ids.0');
});
