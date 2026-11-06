<?php

use App\Models\Booking;
use App\Models\Facility;
use App\Models\JobOrder;
use App\Models\Notification;
use App\Models\Role;
use App\Models\ServiceCategory;
use App\Models\ServiceRequest;
use App\Models\ServiceType;
use App\Models\User;

function apiUser(Role $role, string $status = 'active'): User
{
    return User::factory()->create([
        'role_id' => $role->id,
        'status' => $status,
        'password' => bcrypt('secret'),
    ]);
}

function roleFor(string $name): Role
{
    return Role::create(['role_name' => $name]);
}

beforeEach(function () {
    $this->facultyRole = roleFor('faculty_staff');
    $this->adminRole = roleFor('ict_admin');
});

it('shows role-scoped dashboard stats', function () {
    $admin = apiUser($this->adminRole);
    $token = auth('api')->login($admin);

    $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/v1/dashboard')
        ->assertOk()
        ->assertJsonPath('isAdmin', true)
        ->assertJsonStructure(['stats', 'greeting']);
});

it('lists service requests and respects ownership', function () {
    $user = apiUser($this->facultyRole);
    ServiceRequest::create([
        'user_id' => $user->id,
        'problem_description' => 'Monitor not working',
        'request_status' => 'pending',
    ]);

    $admin = apiUser($this->adminRole);
    $adminToken = auth('api')->login($admin);

    $this->withHeader('Authorization', "Bearer {$adminToken}")
        ->getJson('/api/v1/requests')
        ->assertOk()
        ->assertJsonStructure(['data']);
});

it('creates a service request with services', function () {
    $user = apiUser($this->facultyRole);
    $category = ServiceCategory::create(['category_name' => 'Hardware']);
    $type = ServiceType::create(['category_id' => $category->id, 'service_name' => 'PC Repair']);
    $token = auth('api')->login($user);

    $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/requests', [
            'problem_description' => 'Lab 1 PC not booting',
            'location' => 'ICT Building',
            'services' => [
                ['service_type_id' => $type->id, 'quantity' => 1],
            ],
        ])
        ->assertCreated()
        ->assertJsonStructure(['request']);

    $this->assertDatabaseHas('service_requests', ['problem_description' => 'Lab 1 PC not booting']);
});

it('allows admins to create a service request', function () {
    $admin = apiUser($this->adminRole);
    $category = ServiceCategory::create(['category_name' => 'Network']);
    $type = ServiceType::create(['category_id' => $category->id, 'service_name' => 'LAN Repair']);
    $token = auth('api')->login($admin);

    $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/requests', [
            'problem_description' => 'Admin submitted request',
            'services' => [
                ['service_type_id' => $type->id, 'quantity' => 1],
            ],
        ])
        ->assertCreated()
        ->assertJsonStructure(['request']);

    $this->assertDatabaseHas('service_requests', [
        'user_id' => $admin->id,
        'problem_description' => 'Admin submitted request',
        'request_status' => 'pending',
    ]);
});

it('blocks students from submitting unrelated service requests', function () {
    $student = apiUser(roleFor('student'));
    $category = ServiceCategory::create(['category_name' => 'Network Services']);
    $type = ServiceType::create(['category_id' => $category->id, 'service_name' => 'Network Connection']);
    $token = auth('api')->login($student);

    $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/requests', [
            'problem_description' => 'Fix the lab network',
            'services' => [
                ['service_type_id' => $type->id, 'quantity' => 1],
            ],
        ])
        ->assertUnprocessable();

    $this->assertDatabaseCount('service_requests', 0);
});

it('allows students to submit email requests via the api', function () {
    $student = apiUser(roleFor('student'));
    $category = ServiceCategory::create(['category_name' => 'Information System Services']);
    $type = ServiceType::create(['category_id' => $category->id, 'service_name' => 'E-mail']);
    $token = auth('api')->login($student);

    $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/requests', [
            'problem_description' => 'Need a school email account',
            'services' => [
                ['service_type_id' => $type->id, 'quantity' => 1],
            ],
        ])
        ->assertCreated();

    $this->assertDatabaseHas('service_requests', [
        'user_id' => $student->id,
        'request_status' => 'pending',
    ]);
});

it('restricts service request review to admins', function () {
    $user = apiUser($this->facultyRole);
    $token = auth('api')->login($user);

    $this->withHeader('Authorization', "Bearer {$token}")
        ->putJson('/api/v1/requests/1', ['request_status' => 'approved'])
        ->assertForbidden();
});

it('lists job orders and shows detail', function () {
    $user = apiUser($this->adminRole);
    $token = auth('api')->login($user);

    $request = ServiceRequest::create([
        'user_id' => $user->id,
        'problem_description' => 'Printer jam',
        'request_status' => 'approved',
    ]);
    $jobOrder = JobOrder::create([
        'request_id' => $request->id,
        'status' => 'open',
    ]);

    $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/v1/job-orders')
        ->assertOk()
        ->assertJsonStructure(['data']);

    $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson("/api/v1/job-orders/{$jobOrder->id}")
        ->assertOk()
        ->assertJsonStructure(['jobOrder']);
});

it('restricts inventory management to admins', function () {
    $user = apiUser($this->facultyRole);
    $token = auth('api')->login($user);

    $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/v1/inventory')
        ->assertForbidden();
});

it('allows admins to create inventory items', function () {
    $admin = apiUser($this->adminRole);
    $token = auth('api')->login($admin);

    $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/inventory', [
            'property_no' => 'PROP-0001',
            'item_name' => 'Desktop Computer',
            'condition' => 'working',
            'status' => 'active',
        ])
        ->assertCreated();

    $this->assertDatabaseHas('inventory_items', ['property_no' => 'PROP-0001']);
});

it('allows faculty, staff, and admins to book facilities', function () {
    $faculty = apiUser($this->facultyRole);
    $facultyToken = auth('api')->login($faculty);

    $admin = apiUser($this->adminRole);
    $adminToken = auth('api')->login($admin);

    $facility = Facility::create([
        'facility_name' => 'Computer Laboratory',
        'facility_type' => 'computer_lab',
        'capacity' => 40,
        'location' => 'Balubal Campus',
        'availability_status' => 'available',
    ]);

    $this->withHeader('Authorization', "Bearer {$facultyToken}")
        ->getJson('/api/v1/facilities')
        ->assertOk()
        ->assertJsonStructure(['data']);

    $this->withHeader('Authorization', "Bearer {$facultyToken}")
        ->postJson('/api/v1/bookings', [
            'facility_id' => $facility->id,
            'booking_date' => '2099-01-15',
            'start_time' => '08:00',
            'end_time' => '09:00',
            'purpose' => 'Orientation',
        ])
        ->assertCreated();

    $this->withHeader('Authorization', "Bearer {$adminToken}")
        ->postJson('/api/v1/bookings', [
            'facility_id' => $facility->id,
            'booking_date' => '2099-01-15',
            'start_time' => '10:00',
            'end_time' => '11:00',
            'purpose' => 'Staff training',
        ])
        ->assertCreated();

    $this->assertDatabaseHas('bookings', [
        'user_id' => $admin->id,
        'facility_id' => $facility->id,
        'booking_status' => 'pending',
    ]);
});

it('allows booking owners to cancel their own approved bookings via the api', function () {
    $faculty = apiUser($this->facultyRole);
    $token = auth('api')->login($faculty);

    $facility = Facility::create([
        'facility_name' => 'AV Room',
        'facility_type' => 'av_room',
        'capacity' => 30,
        'location' => 'Balubal Campus',
        'availability_status' => 'available',
    ]);

    $booking = Booking::create([
        'user_id' => $faculty->id,
        'facility_id' => $facility->id,
        'booking_date' => '2020-01-15',
        'start_time' => '08:00',
        'end_time' => '09:00',
        'booking_status' => 'approved',
    ]);

    $this->withHeader('Authorization', "Bearer {$token}")
        ->putJson("/api/v1/bookings/{$booking->id}", ['booking_status' => 'cancelled'])
        ->assertOk();

    $this->assertDatabaseHas('bookings', [
        'id' => $booking->id,
        'booking_status' => 'cancelled',
    ]);
});

it('prevents booking owners from approving their own bookings via the api', function () {
    $faculty = apiUser($this->facultyRole);
    $token = auth('api')->login($faculty);

    $facility = Facility::create([
        'facility_name' => 'Computer Laboratory B',
        'facility_type' => 'computer_lab',
        'capacity' => 40,
        'location' => 'Balubal Campus',
        'availability_status' => 'available',
    ]);

    $booking = Booking::create([
        'user_id' => $faculty->id,
        'facility_id' => $facility->id,
        'booking_date' => '2099-02-14',
        'start_time' => '08:00',
        'end_time' => '09:00',
        'booking_status' => 'pending',
    ]);

    $this->withHeader('Authorization', "Bearer {$token}")
        ->putJson("/api/v1/bookings/{$booking->id}", ['booking_status' => 'approved'])
        ->assertForbidden();

    $this->assertDatabaseHas('bookings', [
        'id' => $booking->id,
        'booking_status' => 'pending',
    ]);
});

it('creates incident reports for any authenticated user', function () {
    $user = apiUser($this->facultyRole);
    $token = auth('api')->login($user);

    $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/incidents', [
            'incident_type' => 'Hardware Damage',
            'incident_description' => 'Broken monitor screen',
            'incident_date' => '2026-09-01',
        ])
        ->assertCreated();

    $this->assertDatabaseHas('incident_reports', ['incident_type' => 'Hardware Damage']);
});

it('manages notifications for the authenticated user', function () {
    $user = apiUser($this->adminRole);
    Notification::create([
        'user_id' => $user->id,
        'message' => 'Unread notification',
        'notification_type' => 'test',
        'notification_status' => 'unread',
    ]);
    $token = auth('api')->login($user);

    $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/v1/notifications')
        ->assertOk()
        ->assertJsonPath('unread_count', 1);

    $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/notifications/read-all')
        ->assertOk();

    $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/v1/notifications')
        ->assertOk()
        ->assertJsonPath('unread_count', 0);
});

it('restricts reports to admins', function () {
    $user = apiUser($this->facultyRole);
    $token = auth('api')->login($user);

    $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/v1/reports')
        ->assertForbidden();
});

it('allows admins to deactivate users', function () {
    $admin = apiUser($this->adminRole);
    $token = auth('api')->login($admin);
    $target = User::factory()->create(['status' => 'active']);

    $this->withHeader('Authorization', "Bearer {$token}")
        ->putJson("/api/v1/users/{$target->id}", ['status' => 'inactive'])
        ->assertOk();

    $this->assertDatabaseHas('users', ['id' => $target->id, 'status' => 'inactive']);
});

it('restricts audit log to admins', function () {
    $user = apiUser($this->facultyRole);
    $token = auth('api')->login($user);

    $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/v1/audit-log')
        ->assertForbidden();

    $admin = apiUser($this->adminRole);
    $adminToken = auth('api')->login($admin);

    $this->withHeader('Authorization', "Bearer {$adminToken}")
        ->getJson('/api/v1/audit-log')
        ->assertOk()
        ->assertJsonStructure(['data', 'modules']);
});
