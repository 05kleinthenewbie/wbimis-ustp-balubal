<?php

use App\Models\Booking;
use App\Models\Facility;
use App\Models\IncidentReport;
use App\Models\InventoryItem;
use App\Models\JobOrder;
use App\Models\Role;
use App\Models\ServiceRequest;
use App\Models\User;

function smokeUser(string $roleName): User
{
    $role = Role::firstOrCreate(['role_name' => $roleName]);

    return User::factory()->create([
        'role_id' => $role->id,
        'status' => 'active',
    ]);
}

test('admin pages render without server errors', function (string $uri) {
    $admin = smokeUser('ict_admin');

    $this->actingAs($admin)->get($uri)->assertSuccessful();
})->with([
    'dashboard' => '/dashboard',
    'request approvals' => '/requests/approvals',
    'requests index' => '/requests',
    'request create' => '/requests/create',
    'job orders index' => '/job-orders',
    'job order assignments' => '/job-orders/assignments',
    'job order progress' => '/job-orders/progress',
    'inventory index' => '/inventory',
    'inventory create' => '/inventory/create',
    'inventory expirations' => '/inventory/expirations',
    'inventory defective' => '/inventory/defective',
    'inventory under repair' => '/inventory/under-repair',
    'bookings index' => '/bookings',
    'bookings create' => '/bookings/create',
    'booking approvals' => '/bookings/approvals',
    'facilities index' => '/facilities',
    'facilities create' => '/facilities/create',
    'incidents index' => '/incidents',
    'incidents create' => '/incidents/create',
    'reports' => '/reports',
    'report export' => '/reports/export',
    'audit log' => '/audit-log',
    'users' => '/users',
    'liabilities' => '/liabilities',
    'notifications' => '/notifications',
    'settings profile' => '/settings/profile',
    'settings appearance' => '/settings/appearance',
]);

test('the security settings page renders once the password is confirmed', function () {
    $admin = smokeUser('ict_admin');

    $this->actingAs($admin)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->get('/settings/security')
        ->assertSuccessful();
});

test('the security settings page requires recent password confirmation', function () {
    foreach (['ict_admin', 'faculty', 'student'] as $roleName) {
        $user = smokeUser($roleName);

        $this->actingAs($user)->get('/settings/security')->assertRedirect();
    }
});

test('admin detail pages render without server errors', function (string $uri) {
    $admin = smokeUser('ict_admin');
    $requester = smokeUser('faculty');

    $serviceRequest = ServiceRequest::create([
        'user_id' => $requester->id,
        'problem_description' => 'Smoke test request',
        'request_status' => 'approved',
    ]);

    $jobOrder = JobOrder::create([
        'request_id' => $serviceRequest->id,
        'assigned_to' => $admin->id,
        'status' => 'open',
        'date_assigned' => now(),
    ]);

    $facility = Facility::create([
        'facility_name' => 'Smoke Test Laboratory',
        'facility_type' => 'computer_lab',
        'capacity' => 30,
        'location' => 'Balubal Campus',
        'availability_status' => 'available',
    ]);

    $booking = Booking::create([
        'user_id' => $requester->id,
        'facility_id' => $facility->id,
        'booking_date' => '2099-03-14',
        'start_time' => '08:00',
        'end_time' => '10:00',
        'purpose' => 'Smoke test booking',
        'booking_status' => 'pending',
    ]);

    $incident = IncidentReport::create([
        'reported_by' => $requester->id,
        'incident_type' => 'Equipment damage',
        'incident_description' => 'Smoke test incident.',
        'incident_date' => '2026-09-01',
        'status' => 'open',
    ]);

    $inventory = InventoryItem::factory()->create();

    $url = strtr($uri, [
        '{request}' => (string) $serviceRequest->id,
        '{jobOrder}' => (string) $jobOrder->id,
        '{booking}' => (string) $booking->id,
        '{facility}' => (string) $facility->id,
        '{incident}' => (string) $incident->id,
        '{inventory}' => (string) $inventory->id,
    ]);

    $this->actingAs($admin)->get($url)->assertSuccessful();
})->with([
    'request show' => '/requests/{request}',
    'job order show' => '/job-orders/{jobOrder}',
    'job order print' => '/job-orders/{jobOrder}/print',
    'booking show' => '/bookings/{booking}',
    'facility edit' => '/facilities/{facility}/edit',
    'incident show' => '/incidents/{incident}',
    'inventory show' => '/inventory/{inventory}',
    'inventory edit' => '/inventory/{inventory}/edit',
    'inventory qr' => '/inventory/{inventory}/qr',
]);

test('faculty pages render without server errors', function (string $uri) {
    $faculty = smokeUser('faculty');

    $this->actingAs($faculty)->get($uri)->assertSuccessful();
})->with([
    'dashboard' => '/dashboard',
    'requests index' => '/requests',
    'request create' => '/requests/create',
    'job orders index' => '/job-orders',
    'bookings index' => '/bookings',
    'bookings create' => '/bookings/create',
    'incidents index' => '/incidents',
    'incidents create' => '/incidents/create',
    'liabilities' => '/liabilities',
    'notifications' => '/notifications',
    'settings profile' => '/settings/profile',
    'settings appearance' => '/settings/appearance',
]);

test('student pages render without server errors', function (string $uri) {
    $student = smokeUser('student');

    $this->actingAs($student)->get($uri)->assertSuccessful();
})->with([
    'dashboard' => '/dashboard',
    'requests index' => '/requests',
    'request create' => '/requests/create',
    'job orders index' => '/job-orders',
    'incidents index' => '/incidents',
    'incidents create' => '/incidents/create',
    'liabilities' => '/liabilities',
    'notifications' => '/notifications',
    'settings profile' => '/settings/profile',
    'settings appearance' => '/settings/appearance',
]);
