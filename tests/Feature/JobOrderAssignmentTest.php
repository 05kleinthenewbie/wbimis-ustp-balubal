<?php

use App\Mail\TechnicianAssigned;
use App\Models\JobOrder;
use App\Models\Role;
use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia as Assert;

function assignTechRole(string $roleName): Role
{
    return Role::firstOrCreate(['role_name' => $roleName]);
}

function assignTechUser(string $roleName): User
{
    return User::factory()->create([
        'role_id' => assignTechRole($roleName)->id,
        'status' => 'active',
    ]);
}

function makeAssignableJobOrder(): JobOrder
{
    $requester = assignTechUser('faculty_staff');

    $serviceRequest = ServiceRequest::create([
        'user_id' => $requester->id,
        'problem_description' => 'Projector will not turn on',
        'request_status' => 'approved',
    ]);

    return JobOrder::create([
        'request_id' => $serviceRequest->id,
        'status' => 'open',
    ]);
}

test('only requesters assigned technicians and admins can view a job order', function () {
    $requester = assignTechUser('faculty_staff');
    $other = assignTechUser('faculty_staff');
    $technician = assignTechUser('ict_admin');
    $admin = assignTechUser('ict_admin');

    $serviceRequest = ServiceRequest::create([
        'user_id' => $requester->id,
        'problem_description' => 'Network cable is damaged.',
        'request_status' => 'approved',
    ]);

    $jobOrder = JobOrder::create([
        'request_id' => $serviceRequest->id,
        'status' => 'open',
        'assigned_to' => $technician->id,
    ]);

    $this->actingAs($requester)
        ->get(route('job-orders.show', $jobOrder))
        ->assertOk();

    $this->actingAs($technician)
        ->get(route('job-orders.show', $jobOrder))
        ->assertOk();

    $this->actingAs($admin)
        ->get(route('job-orders.show', $jobOrder))
        ->assertOk();

    $this->actingAs($other)
        ->get(route('job-orders.show', $jobOrder))
        ->assertForbidden();
});

test('assigning a technician through job order update sets an SLA deadline', function () {
    Mail::fake();

    $admin = assignTechUser('ict_admin');
    $technician = assignTechUser('ict_admin');
    $jobOrder = makeAssignableJobOrder();

    $this->actingAs($admin)
        ->put(route('job-orders.update', $jobOrder), [
            'assigned_to' => $technician->id,
            'status' => 'in_progress',
        ])
        ->assertSessionHasNoErrors();

    $jobOrder->refresh();

    expect($jobOrder->date_assigned)->not->toBeNull()
        ->and($jobOrder->sla_deadline)->not->toBeNull()
        ->and($jobOrder->sla_deadline->greaterThan($jobOrder->date_assigned))->toBeTrue();
});

test('admins can add a technician to a job order from the assignments board', function () {
    Mail::fake();

    $admin = assignTechUser('ict_admin');
    $technician = assignTechUser('ict_admin');
    $jobOrder = makeAssignableJobOrder();

    $this->actingAs($admin)
        ->put(route('job-orders.assign', $jobOrder), ['assigned_to' => $technician->id])
        ->assertRedirect();

    $jobOrder->refresh();

    expect($jobOrder->assigned_to)->toBe($technician->id)
        ->and($jobOrder->date_assigned)->not->toBeNull()
        ->and($jobOrder->sla_deadline)->not->toBeNull()
        ->and($jobOrder->sla_status)->toBe('on_track');

    Mail::assertQueued(TechnicianAssigned::class, fn (TechnicianAssigned $mail) => $mail->hasTo($technician->email));

    $this->assertDatabaseHas('notifications', [
        'user_id' => $technician->id,
        'notification_type' => 'job_order',
        'notification_status' => 'unread',
    ]);
});

test('admins can change the assigned technician', function () {
    Mail::fake();

    $admin = assignTechUser('ict_admin');
    $first = assignTechUser('ict_admin');
    $second = assignTechUser('ict_admin');
    $jobOrder = makeAssignableJobOrder();
    $jobOrder->update(['assigned_to' => $first->id, 'date_assigned' => now()]);

    $this->actingAs($admin)
        ->put(route('job-orders.assign', $jobOrder), ['assigned_to' => $second->id])
        ->assertRedirect();

    expect($jobOrder->refresh()->assigned_to)->toBe($second->id);

    Mail::assertQueued(TechnicianAssigned::class, fn (TechnicianAssigned $mail) => $mail->hasTo($second->email));
});

test('admins can remove the technician from a job order', function () {
    Mail::fake();

    $admin = assignTechUser('ict_admin');
    $technician = assignTechUser('ict_admin');
    $jobOrder = makeAssignableJobOrder();
    $jobOrder->update(['assigned_to' => $technician->id, 'date_assigned' => now()]);

    $this->actingAs($admin)
        ->put(route('job-orders.assign', $jobOrder), ['assigned_to' => null])
        ->assertRedirect();

    expect($jobOrder->refresh()->assigned_to)->toBeNull();
});

test('technicians must hold the ict admin role', function () {
    $admin = assignTechUser('ict_admin');
    $student = assignTechUser('student');
    $jobOrder = makeAssignableJobOrder();

    $this->actingAs($admin)
        ->put(route('job-orders.assign', $jobOrder), ['assigned_to' => $student->id])
        ->assertSessionHasErrors('assigned_to');

    expect($jobOrder->refresh()->assigned_to)->toBeNull();
});

test('faculty and students cannot assign technicians', function () {
    $faculty = assignTechUser('faculty_staff');
    $student = assignTechUser('student');
    $jobOrder = makeAssignableJobOrder();

    $this->actingAs($faculty)
        ->put(route('job-orders.assign', $jobOrder), ['assigned_to' => null])
        ->assertForbidden();

    $this->actingAs($student)
        ->put(route('job-orders.assign', $jobOrder), ['assigned_to' => null])
        ->assertForbidden();
});

test('the assignments board shares the selectable technicians', function () {
    $admin = assignTechUser('ict_admin');
    assignTechUser('ict_admin');

    $this->actingAs($admin)
        ->get('/job-orders/assignments')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('job-orders/assignments')
            ->has('technicians', 2));
});

test('admins can add a new technician without login credentials', function () {
    $admin = assignTechUser('ict_admin');

    $this->actingAs($admin)
        ->post(route('technicians.store'), [
            'name' => 'Juan Technician',
            'department' => 'ICT Office',
            'contact_no' => '0917 123 4567',
        ])
        ->assertRedirect();

    $technician = User::where('name', 'Juan Technician')->firstOrFail();

    expect($technician->status)->toBe('active')
        ->and($technician->is_technician)->toBeTrue()
        ->and($technician->role->role_name)->toBe('ict_admin')
        ->and($technician->email)->not->toBeEmpty()
        ->and($technician->contact_no)->toBe('0917 123 4567')
        ->and(str_starts_with($technician->password, '$2'))->toBeTrue();
});

test('technicians cannot sign in even with a matching password', function () {
    $admin = assignTechUser('ict_admin');

    $this->actingAs($admin)
        ->post(route('technicians.store'), [
            'name' => 'No Login Tech',
            'email' => 'no-login-tech@example.com',
        ])
        ->assertRedirect();

    $technician = User::where('name', 'No Login Tech')->firstOrFail();
    $technician->update(['password' => 'Password123!', 'email_verified_at' => now()]);

    $this->post(route('logout'));

    $this->post(route('login.store'), [
        'email' => $technician->email,
        'password' => 'Password123!',
        'portal' => 'admin',
    ])->assertSessionHasErrors('email');

    $this->assertGuest();
});

test('technician records are not listed as user accounts', function () {
    $admin = assignTechUser('ict_admin');

    $this->actingAs($admin)
        ->post(route('technicians.store'), ['name' => 'Hidden Technician'])
        ->assertRedirect();

    $this->actingAs($admin)
        ->get(route('users.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('activeUsers', 0)
            ->has('deactivatedUsers', 0));
});

test('technician records cannot be activated or deactivated', function () {
    $admin = assignTechUser('ict_admin');

    $this->actingAs($admin)
        ->post(route('technicians.store'), ['name' => 'Locked Technician'])
        ->assertRedirect();

    $technician = User::where('name', 'Locked Technician')->firstOrFail();

    $this->actingAs($admin)
        ->put(route('users.update', $technician->id), ['status' => 'inactive'])
        ->assertSessionHasErrors('status');

    expect($technician->fresh()->status)->toBe('active');
});

test('invalid phone numbers are rejected for a new technician', function () {
    $admin = assignTechUser('ict_admin');

    $this->actingAs($admin)
        ->post(route('technicians.store'), [
            'name' => 'Juan Technician',
            'contact_no' => 'call-me',
        ])
        ->assertSessionHasErrors('contact_no');
});

test('admins can provide the email for a new technician', function () {
    $admin = assignTechUser('ict_admin');

    $this->actingAs($admin)
        ->post(route('technicians.store'), [
            'name' => 'Maria Technician',
            'email' => 'maria.ict@example.com',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('users', [
        'name' => 'Maria Technician',
        'email' => 'maria.ict@example.com',
    ]);
});

test('duplicate technician emails are rejected', function () {
    $admin = assignTechUser('ict_admin');
    $existing = assignTechUser('ict_admin');

    $this->actingAs($admin)
        ->post(route('technicians.store'), [
            'name' => 'Another Technician',
            'email' => $existing->email,
        ])
        ->assertSessionHasErrors('email');
});

test('technician name is required', function () {
    $admin = assignTechUser('ict_admin');

    $this->actingAs($admin)
        ->post(route('technicians.store'), ['department' => 'ICT Office'])
        ->assertSessionHasErrors('name');
});

test('faculty and students cannot add technicians', function () {
    $faculty = assignTechUser('faculty_staff');
    $student = assignTechUser('student');

    $this->actingAs($faculty)
        ->post(route('technicians.store'), ['name' => 'Blocked Tech'])
        ->assertForbidden();

    $this->actingAs($student)
        ->post(route('technicians.store'), ['name' => 'Blocked Tech'])
        ->assertForbidden();
});
