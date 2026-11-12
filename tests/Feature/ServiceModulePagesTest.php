<?php

use App\Models\JobOrder;
use App\Models\Role;
use App\Models\ServiceRequest;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

function servicePagesUser(string $roleName): User
{
    $role = Role::firstOrCreate(['role_name' => $roleName]);

    return User::factory()->create([
        'role_id' => $role->id,
        'status' => 'active',
    ]);
}

test('admins can view the service request approvals queue', function () {
    $admin = servicePagesUser('ict_admin');
    $requester = servicePagesUser('student');

    $pending = ServiceRequest::create([
        'user_id' => $requester->id,
        'problem_description' => 'Please create my email account.',
        'request_status' => 'pending',
    ]);

    ServiceRequest::create([
        'user_id' => $requester->id,
        'problem_description' => 'Office 365 license.',
        'request_status' => 'approved',
    ]);

    $this->actingAs($admin)
        ->get('/requests/approvals')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('requests/approvals')
            ->has('requests', 1)
            ->where('requests.0.id', $pending->id)
            ->where('stats.pending', 1)
            ->where('stats.approved', 1));
});

test('admins can view job order assignments', function () {
    $admin = servicePagesUser('ict_admin');
    $requester = servicePagesUser('faculty');

    $serviceRequest = ServiceRequest::create([
        'user_id' => $requester->id,
        'problem_description' => 'Projector will not power on',
        'request_status' => 'approved',
    ]);

    $assigned = JobOrder::create([
        'request_id' => $serviceRequest->id,
        'assigned_to' => $admin->id,
        'status' => 'open',
        'date_assigned' => now(),
    ]);

    $pending = JobOrder::create([
        'request_id' => $serviceRequest->id,
        'status' => 'open',
    ]);

    $this->actingAs($admin)
        ->get('/job-orders/assignments')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('job-orders/assignments')
            ->has('groups', 1)
            ->where('groups.0.technician.id', $admin->id)
            ->has('groups.0.job_orders', 1)
            ->where('groups.0.job_orders.0.id', $assigned->id)
            ->has('unassigned', 1)
            ->where('unassigned.0.id', $pending->id)
            ->where('stats.assigned', 1)
            ->where('stats.unassigned', 1)
            ->where('stats.active', 2));
});

test('admins can view work progress', function () {
    $admin = servicePagesUser('ict_admin');
    $requester = servicePagesUser('faculty');

    $serviceRequest = ServiceRequest::create([
        'user_id' => $requester->id,
        'problem_description' => 'Printer is offline',
        'request_status' => 'approved',
    ]);

    $inProgress = JobOrder::create([
        'request_id' => $serviceRequest->id,
        'assigned_to' => $admin->id,
        'status' => 'in_progress',
        'date_assigned' => now(),
    ]);

    JobOrder::create([
        'request_id' => $serviceRequest->id,
        'status' => 'completed',
        'date_assigned' => now(),
    ]);

    $this->actingAs($admin)
        ->get('/job-orders/progress')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('job-orders/progress')
            ->has('jobOrders', 1)
            ->where('jobOrders.0.id', $inProgress->id)
            ->where('stats.active', 1)
            ->where('stats.in_progress', 1)
            ->where('stats.open', 0));
});

test('faculty and students cannot view request approvals, assignments, or progress', function () {
    $faculty = servicePagesUser('faculty');
    $student = servicePagesUser('student');

    $this->actingAs($faculty)->get('/requests/approvals')->assertForbidden();
    $this->actingAs($student)->get('/requests/approvals')->assertForbidden();
    $this->actingAs($faculty)->get('/job-orders/assignments')->assertForbidden();
    $this->actingAs($student)->get('/job-orders/assignments')->assertForbidden();
    $this->actingAs($faculty)->get('/job-orders/progress')->assertForbidden();
    $this->actingAs($student)->get('/job-orders/progress')->assertForbidden();
});
