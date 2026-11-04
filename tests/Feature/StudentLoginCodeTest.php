<?php

use App\Models\Role;
use App\Models\User;
use App\Services\StudentLoginCodeService;
use Illuminate\Support\Facades\DB;

function scanLoginStudent(string $status = 'active'): User
{
    return User::factory()->create([
        'role_id' => Role::firstOrCreate(['role_name' => 'student'])->id,
        'status' => $status,
        'id_number' => fake()->unique()->numerify('##########'),
    ]);
}

test('only authenticated active students can generate login codes', function () {
    $this->postJson(route('student.login-codes.store'))->assertUnauthorized();
    $faculty = User::factory()->create(['role_id' => Role::firstOrCreate(['role_name' => 'faculty_staff'])->id]);
    $this->actingAs($faculty)->postJson(route('student.login-codes.store'))->assertForbidden();
    $this->actingAs(scanLoginStudent('pending'))->postJson(route('student.login-codes.store'))->assertForbidden();
    $this->assertDatabaseCount('student_login_codes', 0);
});

test('a login code belongs to its issuer and only its hash is stored', function () {
    $this->freezeTime();
    $student = scanLoginStudent();
    $otherStudent = scanLoginStudent();
    $result = $this->actingAs($student)->postJson(route('student.login-codes.store'), ['user_id' => $otherStudent->id])
        ->assertOk()->assertHeader('Cache-Control', 'no-store, private')->json();

    expect($result['code'])->toMatch('/^WBIMIS:[A-Za-z0-9]{32}$/')
        ->and($result['expiresAt'])->toBe(now()->addMinutes(5)->toIso8601String());
    $record = DB::table('student_login_codes')->first();
    expect($record->user_id)->toBe($student->id)
        ->and($record->token_hash)->toBe(hash('sha256', $result['code']))
        ->and($record->token_hash)->not->toBe($result['code']);
});

test('scanning a valid code logs a guest in without a password and consumes the code', function () {
    $student = scanLoginStudent();
    $code = app(StudentLoginCodeService::class)->issue($student)['code'];

    $this->post(route('student.login-codes.redeem'), ['code' => $code])->assertRedirect(route('dashboard'));
    $this->assertAuthenticatedAs($student);
    expect(DB::table('student_login_codes')->where('user_id', $student->id)->value('used_at'))->not->toBeNull();

    $this->post(route('logout'));
    $this->post(route('student.login-codes.redeem'), ['code' => $code])->assertSessionHasErrors('code');
    $this->assertGuest();
});

test('expired codes and codes at the expiry boundary cannot log in', function (int $minutes) {
    $code = app(StudentLoginCodeService::class)->issue(scanLoginStudent())['code'];
    $this->travel($minutes)->minutes();

    $this->post(route('student.login-codes.redeem'), ['code' => $code])->assertSessionHasErrors('code');
    $this->assertGuest();
})->with([5, 6]);

test('generating a new code invalidates the old code', function () {
    $student = scanLoginStudent();
    $codes = app(StudentLoginCodeService::class);
    $first = $codes->issue($student)['code'];
    $second = $codes->issue($student)['code'];

    expect($first)->not->toBe($second);
    $this->assertDatabaseCount('student_login_codes', 1);
    $this->post(route('student.login-codes.redeem'), ['code' => $first])->assertSessionHasErrors('code');
    $this->assertGuest();
    $this->post(route('student.login-codes.redeem'), ['code' => $second])->assertRedirect(route('dashboard'));
    $this->assertAuthenticatedAs($student);
});

test('a code cannot bypass a student status or role change', function (string $status, string $roleName) {
    $student = scanLoginStudent();
    $code = app(StudentLoginCodeService::class)->issue($student)['code'];
    $student->update(['status' => $status, 'role_id' => Role::firstOrCreate(['role_name' => $roleName])->id]);

    $this->post(route('student.login-codes.redeem'), ['code' => $code])->assertSessionHasErrors('code');
    $this->assertGuest();
})->with([
    ['pending', 'student'], ['inactive', 'student'], ['rejected', 'student'], ['active', 'faculty_staff'],
]);

test('printed student numbers arbitrary URLs and tampered codes cannot automatically authenticate', function (string $code) {
    scanLoginStudent();

    $this->post(route('student.login-codes.redeem'), ['code' => $code])->assertSessionHasErrors('code');
    $this->assertGuest();
})->with([
    '2023303709',
    'https://attacker.example/login',
    'WBIMIS:'.'ABCDEFGHIJKLMNOPQRSTUVWXYZ123456',
    'WBIMIS:<script>alert(1)</script>',
]);

test('scan login attempts are rate limited', function () {
    for ($attempt = 0; $attempt < 6; $attempt++) {
        $this->postJson(route('student.login-codes.redeem'), ['code' => '2023303709'])->assertUnprocessable();
    }

    $this->postJson(route('student.login-codes.redeem'), ['code' => '2023303709'])->assertTooManyRequests();
    $this->assertGuest();
});
