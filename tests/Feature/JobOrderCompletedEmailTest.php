<?php

use App\Mail\JobOrderCompleted;
use App\Models\JobOrder;
use App\Models\Role;
use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

function jobOrderAdmin(): User
{
    $role = Role::firstOrCreate(['role_name' => 'ict_admin']);

    return User::factory()->create(['role_id' => $role->id]);
}

function jobOrderRequest(): array
{
    $requester = User::factory()->create();

    $serviceRequest = ServiceRequest::create([
        'user_id' => $requester->id,
        'problem_description' => 'PC will not boot',
        'request_status' => 'approved',
    ]);

    $jobOrder = JobOrder::create([
        'request_id' => $serviceRequest->id,
        'status' => 'open',
    ]);

    return [$requester, $jobOrder];
}

test('completing a job order queues the completion email to the requester', function () {
    Mail::fake();

    [$requester, $jobOrder] = jobOrderRequest();
    $admin = jobOrderAdmin();

    $this->actingAs($admin)
        ->put(route('job-orders.update', $jobOrder), ['status' => 'completed'])
        ->assertRedirect();

    Mail::assertQueued(JobOrderCompleted::class, function (JobOrderCompleted $mail) use ($requester, $jobOrder) {
        return $mail->hasTo($requester->email)
            && $mail->hasSubject('Job Order #'.$jobOrder->id.' Completed');
    });

    $this->assertDatabaseHas('notifications', [
        'user_id' => $requester->id,
        'notification_type' => 'job_order',
        'notification_status' => 'unread',
    ]);
});

test('updating an already completed job order does not resend the completion email', function () {
    Mail::fake();

    [$requester, $jobOrder] = jobOrderRequest();
    $jobOrder->update(['status' => 'completed']);
    $admin = jobOrderAdmin();

    $this->actingAs($admin)
        ->put(route('job-orders.update', $jobOrder), [
            'status' => 'completed',
            'resolution' => 'Replaced PSU',
        ])
        ->assertRedirect();

    Mail::assertNotQueued(JobOrderCompleted::class);
    $this->assertDatabaseMissing('notifications', [
        'user_id' => $requester->id,
        'message' => 'Your job order #'.$jobOrder->job_order_number.' has been completed. Please rate the service.',
    ]);
});

test('non admin users cannot complete a job order', function () {
    Mail::fake();

    [, $jobOrder] = jobOrderRequest();
    $facultyRole = Role::firstOrCreate(['role_name' => 'faculty']);
    $faculty = User::factory()->create(['role_id' => $facultyRole->id]);

    $this->actingAs($faculty)
        ->put(route('job-orders.update', $jobOrder), ['status' => 'completed'])
        ->assertForbidden();

    Mail::assertNotQueued(JobOrderCompleted::class);
});
