<?php

use App\Models\Facility;
use App\Models\InventoryItem;
use App\Models\Role;
use App\Models\User;

function reportAdmin(): User
{
    $role = Role::firstOrCreate(['role_name' => 'ict_admin']);

    return User::factory()->create(['role_id' => $role->id]);
}

function reportFaculty(): User
{
    $role = Role::firstOrCreate(['role_name' => 'faculty']);

    return User::factory()->create(['role_id' => $role->id]);
}

test('guests are redirected to login from the report export', function () {
    $this->get(route('reports.export'))->assertRedirect(route('login'));
});

test('guests are redirected to login from the reports page', function () {
    $this->get(route('reports.index'))->assertRedirect(route('login'));
});

test('non admins cannot view the reports page', function () {
    $faculty = reportFaculty();

    $this->actingAs($faculty)->get(route('reports.index'))->assertForbidden();
});

test('admin can view the reports page with inventory status and service life data', function () {
    $admin = reportAdmin();
    InventoryItem::factory()->create([
        'status' => 'for_disposal',
        'expiration_date' => '2020-01-01',
    ]);

    $response = $this->actingAs($admin)->get(route('reports.index'));

    $response->assertOk();
    $response->assertInertia(
        fn ($page) => $page->component('reports/index')
            ->where('inventoryStats.by_status.for_disposal', 1)
            ->where('inventoryStats.past_service_life', 1)
            ->where('inventoryStats.expiring_soon', 0)
    );
});

test('non admins cannot export reports', function () {
    $faculty = reportFaculty();

    $this->actingAs($faculty)->get(route('reports.export'))->assertForbidden();
});

test('admin can export the report summary as csv', function () {
    $admin = reportAdmin();
    Facility::create([
        'facility_name' => 'Computer Laboratory',
        'facility_type' => 'computer_lab',
        'capacity' => 40,
        'location' => 'ICT Building',
        'availability_status' => 'available',
    ]);
    InventoryItem::factory()->create([
        'status' => 'for_disposal',
        'expiration_date' => '2020-01-01',
    ]);

    $response = $this->actingAs($admin)->get(route('reports.export'));

    $response->assertOk();
    expect($response->headers->get('Content-Type'))->toContain('text/csv');
    expect($response->headers->get('Content-Disposition'))->toContain('ict-reports-');

    $content = $response->streamedContent();

    expect($content)->toStartWith("\xEF\xBB\xBF")
        ->toContain('Module,Metric,Value')
        ->not->toContain("\xE2\x80\x94")
        ->toContain('Service Requests')
        ->toContain('Job Orders')
        ->toContain('Inventory')
        ->toContain('By status - for_disposal')
        ->toContain('Past service life')
        ->toContain('Expiring in 30 days')
        ->toContain('Bookings')
        ->toContain('Facility Utilization')
        ->toContain('Computer Laboratory - Total bookings')
        ->toContain('Incidents')
        ->toContain('Liabilities');
});

test('reports page includes the overview and six month activity summary', function () {
    $admin = reportAdmin();

    $this->actingAs($admin)
        ->get(route('reports.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('reports/index')
            ->where('overview.facility_bookings', 0)
            ->where('overview.service_requests', 0)
            ->where('overview.job_orders', 0)
            ->where('overview.completed_job_orders', 0)
            ->has('monthlyActivity', 6)
            ->has('monthlyActivity.0', fn ($row) => $row
                ->has('month')
                ->has('bookings')
                ->has('service_requests')
                ->has('job_orders')));
});
