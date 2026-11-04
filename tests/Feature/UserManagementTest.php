<?php

use App\Events\UserApproved;
use App\Models\Notification;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

function mgmtUser(string $roleName, string $status = 'active'): User
{
    $role = Role::firstOrCreate(['role_name' => $roleName]);

    return User::factory()->create(['role_id' => $role->id, 'status' => $status]);
}

test('the user management page lists active and deactivated users', function () {
    $admin = mgmtUser('ict_admin');
    mgmtUser('faculty_staff');
    mgmtUser('student', 'inactive');
    User::factory()->create(['status' => 'pending']);

    $this->actingAs($admin)
        ->get(route('users.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('users/index')
            ->has('pendingUsers', 1)
            ->has('activeUsers', 1)
            ->has('deactivatedUsers', 1));
});

test('admins can deactivate an active account', function () {
    $admin = mgmtUser('ict_admin');
    $user = mgmtUser('faculty_staff');

    $this->actingAs($admin)
        ->put(route('users.update', $user->id), ['status' => 'inactive'])
        ->assertRedirect();

    $this->assertDatabaseHas('users', ['id' => $user->id, 'status' => 'inactive']);

    expect(Notification::where('user_id', $user->id)->latest('id')->first()->message)
        ->toBe('Your account has been deactivated. Please contact the ICT office for more information.');
});

test('admins can reactivate a deactivated account', function () {
    $admin = mgmtUser('ict_admin');
    $user = mgmtUser('student', 'inactive');

    $this->actingAs($admin)
        ->put(route('users.update', $user->id), ['status' => 'active'])
        ->assertRedirect();

    $this->assertDatabaseHas('users', ['id' => $user->id, 'status' => 'active']);

    expect(Notification::where('user_id', $user->id)->latest('id')->first()->message)
        ->toBe('Your account has been reactivated. You can now log in.');
});

test('rejecting a pending registration removes it from the database', function () {
    $admin = mgmtUser('ict_admin');
    $user = mgmtUser('faculty_staff', 'pending');

    $this->actingAs($admin)
        ->put(route('users.update', $user->id), ['status' => 'inactive'])
        ->assertRedirect();

    $this->assertDatabaseMissing('users', ['id' => $user->id]);
    expect(User::where('email', $user->email)->exists())->toBeFalse();
});

test('rejected registrations are separate from deactivated accounts and must be reviewed again', function () {
    $admin = mgmtUser('ict_admin');
    $rejected = mgmtUser('faculty_staff', 'rejected');
    mgmtUser('faculty_staff', 'inactive');
    $this->actingAs($admin)->get(route('users.index'))
        ->assertInertia(fn (Assert $page) => $page->has('rejectedUsers', 1)->has('deactivatedUsers', 1));
    $this->put(route('users.update', $rejected), ['status' => 'active'])->assertSessionHasErrors('status');
    expect($rejected->refresh()->status)->toBe('rejected');
    $this->put(route('users.update', $rejected), ['status' => 'pending'])->assertRedirect();
    expect($rejected->refresh()->status)->toBe('pending');
});

test('rejected applicants cannot authenticate through web or API login', function () {
    $rejected = mgmtUser('faculty_staff', 'rejected');
    $this->post(route('login.store'), ['email' => $rejected->email, 'password' => 'password'])
        ->assertSessionHasErrors('email');
    $this->assertGuest();
    $this->postJson('/api/v1/auth/login', ['email' => $rejected->email, 'password' => 'password'])
        ->assertForbidden();
});

test('non-admins cannot manage user accounts', function () {
    $faculty = mgmtUser('faculty_staff');
    $target = mgmtUser('student');

    $this->actingAs($faculty)->get(route('users.index'))->assertForbidden();
    $this->actingAs($faculty)
        ->put(route('users.update', $target->id), ['status' => 'inactive'])
        ->assertForbidden();
});

test('the user management page exposes the COR link for pending students', function () {
    Storage::fake('local');
    Storage::disk('local')->put('cor/students/cor.pdf', 'cor contents');

    $admin = mgmtUser('ict_admin');
    $student = mgmtUser('student', 'pending');
    $student->update([
        'cor_path' => 'cor/students/cor.pdf',
        'cor_original_name' => 'cor.pdf',
    ]);

    $this->actingAs($admin)
        ->get(route('users.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('users/index')
            ->where(
                'pendingUsers.0.cor_url',
                route('users.cor', $student->id),
            ));
});

test('a pending student cannot be approved without a COR', function () {
    Storage::fake('local');
    $admin = mgmtUser('ict_admin');
    $student = mgmtUser('student', 'pending');

    $this->actingAs($admin)
        ->put(route('users.update', $student->id), ['status' => 'active'])
        ->assertSessionHasErrors('status');

    expect($student->refresh()->status)->toBe('pending');
});

test('blocked student registrations expose a disabled approval reason and cannot be activated', function (?string $path, string $verificationStatus, bool $fileExists) {
    Storage::fake('local');
    Event::fake([UserApproved::class]);
    $admin = mgmtUser('ict_admin');
    $student = mgmtUser('student', 'pending');
    $student->forceFill(['cor_path' => $path, 'cor_verification_status' => $verificationStatus])->save();
    if ($fileExists) {
        Storage::disk('local')->put($path, 'COR contents');
    }

    $reason = $student->approval_block_reason;
    expect($reason)->toBeString()->not->toBeEmpty();

    $this->actingAs($admin)->get(route('users.index'))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('pendingUsers.0.id', $student->id)
        ->where('pendingUsers.0.approval_block_reason', $reason));
    $this->put(route('users.update', $student), ['status' => 'active'])
        ->assertSessionHasErrors(['status' => $reason]);

    expect($student->refresh()->status)->toBe('pending');
    $this->assertDatabaseMissing('notifications', ['user_id' => $student->id]);
    $this->assertDatabaseMissing('audit_logs', ['record_id' => $student->id, 'module_name' => 'users']);
    Event::assertNotDispatched(UserApproved::class);
})->with([
    'no uploaded COR' => [null, 'matched', false],
    'COR file missing from storage' => ['cor/students/missing.pdf', 'matched', false],
    'details mismatch despite uploaded COR' => ['cor/students/cor.pdf', 'mismatch', true],
]);

test('the API cannot bypass missing COR or mismatch approval restrictions', function (bool $hasCor) {
    Storage::fake('local');
    Event::fake([UserApproved::class]);
    $student = mgmtUser('student', 'pending');
    if ($hasCor) {
        Storage::disk('local')->put('cor/student.pdf', 'COR contents');
        $student->forceFill(['cor_path' => 'cor/student.pdf', 'cor_verification_status' => 'mismatch'])->save();
    }

    $this->actingAs(mgmtUser('ict_admin'), 'api')
        ->putJson('/api/v1/users/'.$student->id, ['status' => 'active'])
        ->assertUnprocessable()->assertJsonValidationErrors('status');

    expect($student->refresh()->status)->toBe('pending');
    $this->assertDatabaseMissing('notifications', ['user_id' => $student->id]);
    Event::assertNotDispatched(UserApproved::class);
})->with(['missing COR' => false, 'mismatched COR' => true]);

test('students with an available non mismatched COR remain eligible for admin approval', function (?string $verificationStatus) {
    Storage::fake('local');
    Event::fake([UserApproved::class]);
    Storage::disk('local')->put('cor/student.pdf', 'COR contents');
    $student = mgmtUser('student', 'pending');
    $student->forceFill(['cor_path' => 'cor/student.pdf', 'cor_verification_status' => $verificationStatus])->save();

    expect($student->approval_block_reason)->toBeNull();

    $this->actingAs(mgmtUser('ict_admin'))
        ->put(route('users.update', $student), ['status' => 'active'])
        ->assertSessionHasNoErrors()->assertRedirect();

    expect($student->refresh()->status)->toBe('active');
})->with([null, 'matched', 'manual_review']);

test('a pending student with a COR can be approved', function () {
    Storage::fake('local');
    Storage::disk('local')->put('cor/students/cor.pdf', 'cor contents');

    $admin = mgmtUser('ict_admin');
    $student = mgmtUser('student', 'pending');
    $student->update([
        'cor_path' => 'cor/students/cor.pdf',
        'cor_original_name' => 'cor.pdf',
    ]);

    $this->actingAs($admin)
        ->put(route('users.update', $student->id), ['status' => 'active'])
        ->assertRedirect();

    expect($student->refresh()->status)->toBe('active');
});

test('admins can view a COR inline without an automatic download and other users cannot', function () {
    Storage::fake('local');
    $contents = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF";
    Storage::disk('local')->put('cor/students/cor.pdf', $contents);

    $admin = mgmtUser('ict_admin');
    $faculty = mgmtUser('faculty_staff');
    $student = mgmtUser('student', 'pending');
    $student->update([
        'cor_path' => 'cor/students/cor.pdf',
        'cor_original_name' => 'cor.pdf',
    ]);

    $this->actingAs($admin)
        ->get(route('users.cor', $student->id))
        ->assertOk()
        ->assertHeader('Content-Disposition', 'inline; filename=cor.pdf')
        ->assertHeader('Content-Type', 'application/pdf')
        ->assertHeader('X-Frame-Options', 'SAMEORIGIN')
        ->assertStreamedContent($contents);

    $this->actingAs($faculty)
        ->get(route('users.cor', $student->id))
        ->assertForbidden();
});

test('viewing a missing COR returns not found', function () {
    Storage::fake('local');
    $admin = mgmtUser('ict_admin');
    $student = mgmtUser('student', 'pending');

    $this->actingAs($admin)
        ->get(route('users.cor', $student->id))
        ->assertNotFound();
});

test('image CORs are also served inline for the in site preview', function () {
    Storage::fake('local');
    $contents = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1sAAAAASUVORK5CYII=');
    Storage::disk('local')->put('cor/student.png', $contents);
    $student = mgmtUser('student', 'pending');
    $student->update(['cor_path' => 'cor/student.png', 'cor_original_name' => 'cor.png']);

    $this->actingAs(mgmtUser('ict_admin'))->get(route('users.cor', $student))
        ->assertOk()
        ->assertHeader('Content-Type', 'image/png')
        ->assertHeader('Content-Disposition', 'inline; filename=cor.png')
        ->assertStreamedContent($contents);
});

test('unsupported stored files cannot execute inside a COR preview', function () {
    Storage::fake('local');
    Storage::disk('local')->put('cor/student.pdf', '<html><script>alert(1)</script></html>');
    $student = mgmtUser('student', 'pending');
    $student->update(['cor_path' => 'cor/student.pdf', 'cor_original_name' => 'cor.pdf']);

    $this->actingAs(mgmtUser('ict_admin'))->get(route('users.cor', $student))->assertStatus(415);
});

test('COR previews require an authenticated administrator', function () {
    $student = mgmtUser('student', 'pending');

    $this->get(route('users.cor', $student))->assertRedirect(route('login'));
});
