<?php

use App\Models\Booking;
use App\Models\Facility;
use App\Models\IncidentReport;
use App\Models\InventoryItem;
use App\Models\JobOrder;
use App\Models\Role;
use App\Models\ServiceRequest;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected to the login page', function () {
    User::factory()->create();

    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $role = Role::firstOrCreate(['role_name' => 'faculty']);
    $user = User::factory()->create(['role_id' => $role->id]);

    $response = $this
        ->actingAs($user)
        ->get(route('dashboard'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('dashboard')
        ->where('isAdmin', false)
        ->where('period', 'month')
        ->where('overview.serviceRequests.total', 0)
        ->where('overview.bookings.total', 0)
        ->where('overview.pendingActions.total', 0)
        ->missing('overview.jobOrders')
        ->missing('overview.inventory')
        ->has('activitySeries.labels', 6)
        ->where('inventoryAlerts', null));
});

test('admin dashboard surfaces assignment, sla, and inventory expiry stats', function () {
    $adminRole = Role::firstOrCreate(['role_name' => 'ict_admin']);
    $admin = User::factory()->create(['role_id' => $adminRole->id]);
    $technician = User::factory()->create(['role_id' => $adminRole->id]);

    $requesterRole = Role::firstOrCreate(['role_name' => 'faculty']);
    $requester = User::factory()->create(['role_id' => $requesterRole->id]);

    $serviceRequest = ServiceRequest::create([
        'user_id' => $requester->id,
        'problem_description' => 'Dashboard check request',
        'request_status' => 'pending',
    ]);

    JobOrder::create([
        'request_id' => $serviceRequest->id,
        'status' => 'open',
    ]);

    JobOrder::create([
        'request_id' => $serviceRequest->id,
        'assigned_to' => $technician->id,
        'status' => 'in_progress',
        'date_assigned' => now()->subDays(3),
        'sla_deadline' => now()->subDay(),
    ]);

    InventoryItem::factory()->create(['expiration_date' => now()->addDays(10)]);
    InventoryItem::factory()->create(['expiration_date' => now()->subDays(5)]);
    InventoryItem::factory()->create(['expiration_date' => null]);

    $this->actingAs($admin)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('isAdmin', true)
            ->where('stats.technicians', 2)
            ->where('stats.unassignedJobOrders', 1)
            ->where('stats.overdueJobOrders', 1)
            ->where('stats.inventoryExpiryAlerts', 2)
            ->where('stats.pendingRequests', 1));
});

test('admin dashboard overview, pending actions, and alerts are exposed', function () {
    $adminRole = Role::firstOrCreate(['role_name' => 'ict_admin']);
    $admin = User::factory()->create(['role_id' => $adminRole->id]);

    $requesterRole = Role::firstOrCreate(['role_name' => 'faculty']);
    $requester = User::factory()->create(['role_id' => $requesterRole->id]);

    ServiceRequest::create([
        'user_id' => $requester->id,
        'problem_description' => 'Overview check request',
        'request_status' => 'pending',
    ]);

    $this->actingAs($admin)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('period', 'month')
            ->has('activitySeries.labels', 6)
            ->has('activitySeries.bookings', 6)
            ->has('activitySeries.requests', 6)
            ->has('activitySeries.jobOrders', 6)
            ->where('overview.serviceRequests.pending', 1)
            ->where('overview.inventory.defective', 0)
            ->where('overview.pendingActions.total', 1)
            ->where('pendingActions.requestApprovals', 1)
            ->where('pendingActions.bookingApprovals', 0)
            ->where('inventoryAlerts.defective', 0)
            ->where('inventoryAlerts.expired', 0));
});

test('admin dashboard period filter scopes totals and activity buckets', function () {
    $adminRole = Role::firstOrCreate(['role_name' => 'ict_admin']);
    $admin = User::factory()->create(['role_id' => $adminRole->id]);

    $requesterRole = Role::firstOrCreate(['role_name' => 'faculty']);
    $requester = User::factory()->create(['role_id' => $requesterRole->id]);

    $oldRequest = ServiceRequest::create([
        'user_id' => $requester->id,
        'problem_description' => 'Older request outside the week window',
        'request_status' => 'pending',
    ]);
    $oldRequest->created_at = now()->subDays(10);
    $oldRequest->save();

    ServiceRequest::create([
        'user_id' => $requester->id,
        'problem_description' => 'Fresh request',
        'request_status' => 'pending',
    ]);

    $this->actingAs($admin)
        ->get(route('dashboard', ['period' => 'year']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('period', 'year')
            ->where('overview.serviceRequests.total', 2)
            ->has('activitySeries.labels', 12));

    $this->actingAs($admin)
        ->get(route('dashboard', ['period' => 'month']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('period', 'month')
            ->where('overview.serviceRequests.total', 2)
            ->has('activitySeries.labels', 6));

    $this->actingAs($admin)
        ->get(route('dashboard', ['period' => 'week']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('period', 'month')
            ->where('overview.serviceRequests.total', 2)
            ->has('activitySeries.labels', 6));

    $this->actingAs($admin)
        ->get(route('dashboard', ['period' => 'bogus']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('period', 'month'));
});

test('faculty dashboard scopes overview, pending actions, and activity to their own data', function () {
    $adminRole = Role::firstOrCreate(['role_name' => 'ict_admin']);
    $facultyRole = Role::firstOrCreate(['role_name' => 'faculty']);

    $faculty = User::factory()->create(['role_id' => $facultyRole->id]);
    $otherFaculty = User::factory()->create(['role_id' => $facultyRole->id]);
    User::factory()->create(['role_id' => $adminRole->id]);

    ServiceRequest::create([
        'user_id' => $faculty->id,
        'problem_description' => 'Faculty request pending',
        'request_status' => 'pending',
    ]);
    ServiceRequest::create([
        'user_id' => $faculty->id,
        'problem_description' => 'Faculty request approved',
        'request_status' => 'approved',
    ]);
    ServiceRequest::create([
        'user_id' => $faculty->id,
        'problem_description' => 'Faculty request rejected',
        'request_status' => 'rejected',
    ]);
    ServiceRequest::create([
        'user_id' => $otherFaculty->id,
        'problem_description' => 'Someone else request',
        'request_status' => 'pending',
    ]);

    $facility = Facility::create([
        'facility_name' => 'Computer Laboratory B',
        'facility_type' => 'computer_lab',
        'capacity' => 35,
        'location' => 'Balubal Campus',
        'availability_status' => 'available',
    ]);

    foreach ([$faculty, $otherFaculty] as $owner) {
        Booking::create([
            'user_id' => $owner->id,
            'facility_id' => $facility->id,
            'booking_date' => now()->addDays(3)->toDateString(),
            'start_time' => '09:00',
            'end_time' => '11:00',
            'purpose' => 'Dashboard scope check',
            'booking_status' => 'pending',
        ]);

        IncidentReport::create([
            'reported_by' => $owner->id,
            'incident_type' => 'Equipment damage',
            'incident_description' => 'Dashboard scope check incident.',
            'incident_date' => now()->toDateString(),
            'status' => 'open',
        ]);
    }

    $this->actingAs($faculty)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('isAdmin', false)
            ->where('period', 'month')
            ->where('overview.serviceRequests.total', 3)
            ->where('overview.serviceRequests.pending', 1)
            ->where('overview.serviceRequests.approved', 1)
            ->where('overview.serviceRequests.completed', 0)
            ->where('overview.bookings.total', 1)
            ->where('overview.bookings.pending', 1)
            ->where('overview.incidents.total', 1)
            ->where('overview.incidents.unresolved', 1)
            ->missing('overview.jobOrders')
            ->missing('overview.inventory')
            ->where('overview.pendingActions.total', 4)
            ->where('pendingActions.requestApprovals', 1)
            ->where('pendingActions.rejectedRequests', 1)
            ->where('pendingActions.bookingApprovals', 1)
            ->where('pendingActions.incidentsUnresolved', 1)
            ->where('inventoryAlerts', null)
            ->has('activitySeries.labels', 6)
            ->has('activitySeries.requests', 6)
            ->has('activitySeries.bookings', 6)
            ->has('activitySeries.incidents', 6)
            ->missing('activitySeries.jobOrders'));
});

test('student dashboard shows requests and own laboratory incidents without booking modules', function () {
    $studentRole = Role::firstOrCreate(['role_name' => 'student']);
    $student = User::factory()->create(['role_id' => $studentRole->id]);

    ServiceRequest::create([
        'user_id' => $student->id,
        'problem_description' => 'Student request pending',
        'request_status' => 'pending',
    ]);
    ServiceRequest::create([
        'user_id' => $student->id,
        'problem_description' => 'Student request approved',
        'request_status' => 'approved',
    ]);
    ServiceRequest::create([
        'user_id' => $student->id,
        'problem_description' => 'Student request completed',
        'request_status' => 'completed',
    ]);

    $olderRequest = ServiceRequest::create([
        'user_id' => $student->id,
        'problem_description' => 'Older student request',
        'request_status' => 'pending',
    ]);
    $olderRequest->created_at = now()->subDays(20);
    $olderRequest->save();

    IncidentReport::create([
        'reported_by' => $student->id,
        'incident_type' => 'Equipment damage',
        'incident_description' => 'My laboratory report',
        'status' => 'open',
    ]);
    IncidentReport::create([
        'reported_by' => User::factory()->create()->id,
        'incident_type' => 'Safety concern',
        'incident_description' => 'Someone else report',
        'status' => 'open',
    ]);

    $this->actingAs($student)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('period', 'month')
            ->where('overview.serviceRequests.total', 4)
            ->where('overview.serviceRequests.approved', 1)
            ->where('overview.serviceRequests.completed', 1)
            ->missing('overview.bookings')
            ->where('overview.incidents.total', 1)
            ->where('overview.incidents.unresolved', 1)
            ->has('recentIncidents', 1)
            ->where('recentIncidents.0.reporter_name', $student->name)
            ->missing('overview.jobOrders')
            ->missing('overview.inventory')
            ->where('overview.pendingActions.total', 3)
            ->where('pendingActions.requestApprovals', 2)
            ->where('pendingActions.rejectedRequests', 0)
            ->missing('pendingActions.bookingApprovals')
            ->where('pendingActions.incidentsUnresolved', 1)
            ->where('inventoryAlerts', null)
            ->where('activitySeries', null));

    $this->actingAs($student)
        ->get(route('dashboard', ['period' => 'week']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('period', 'month')
            ->where('overview.serviceRequests.total', 4)
            ->where('activitySeries', null));
});
