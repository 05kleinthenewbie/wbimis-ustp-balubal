<?php

use App\Models\JobOrder;
use App\Models\Role;
use App\Models\ServiceCategory;
use App\Models\ServiceRequest;
use App\Models\ServiceType;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia as Assert;

function wpAdmin(): User
{
    $role = Role::firstOrCreate(['role_name' => 'ict_admin']);

    return User::factory()->create(['role_id' => $role->id]);
}

function wpRequester(): User
{
    $role = Role::firstOrCreate(['role_name' => 'faculty_staff']);

    return User::factory()->create(['role_id' => $role->id]);
}

function wpServiceType(): ServiceType
{
    $category = ServiceCategory::firstOrCreate(['category_name' => 'Hardware']);

    return ServiceType::firstOrCreate(
        ['category_id' => $category->id, 'service_name' => 'PC Repair'],
    );
}

function wpRequestPayload(string $description, ServiceType $type): array
{
    return [
        'problem_description' => $description,
        'services' => [
            ['service_type_id' => $type->id, 'quantity' => 1],
        ],
    ];
}

test('submitted requests derive priority from the note 2 rules', function (string $description, string $expected) {
    $admin = wpAdmin();
    $type = wpServiceType();

    $this->actingAs($admin)
        ->post(route('requests.store'), wpRequestPayload($description, $type))
        ->assertRedirect(route('requests.index'));

    expect(ServiceRequest::query()->latest('id')->firstOrFail()->priority_level)->toBe($expected);
})->with([
    'virus is high' => ['The computer is infected with a virus', 'high'],
    'department wide is high' => ['The whole department printer is offline', 'high'],
    'single printer is not assumed department wide' => ['My printer is offline', 'medium'],
    'non operational is high' => ['The monitor is dead and will not turn on', 'high'],
    'intermittent is medium' => ['The mouse is intermittent and sometimes unresponsive', 'medium'],
]);

test('pending approvals are ordered by priority then first come first served', function () {
    $admin = wpAdmin();
    $requester = wpRequester();

    $olderMedium = ServiceRequest::create([
        'user_id' => $requester->id, 'problem_description' => 'Older medium', 'request_status' => 'pending',
        'priority_level' => 'medium', 'date_requested' => now()->subHours(3),
    ]);
    $newerMedium = ServiceRequest::create([
        'user_id' => $requester->id, 'problem_description' => 'Newer medium', 'request_status' => 'pending',
        'priority_level' => 'medium', 'date_requested' => now()->subHour(),
    ]);
    $urgent = ServiceRequest::create([
        'user_id' => $requester->id, 'problem_description' => 'Virus outbreak', 'request_status' => 'pending',
        'priority_level' => 'urgent', 'date_requested' => now()->subMinutes(10),
    ]);

    $this->actingAs($admin)
        ->get(route('requests.approvals'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('requests/approvals')
            ->where('requests.0.id', $urgent->id)
            ->where('requests.1.id', $olderMedium->id)
            ->where('requests.2.id', $newerMedium->id));
});

test('job order queues follow priority then age', function () {
    $admin = wpAdmin();
    $requester = wpRequester();

    $makeJobOrder = function (string $priority, $createdAt) use ($requester): JobOrder {
        $request = ServiceRequest::create([
            'user_id' => $requester->id, 'problem_description' => 'Issue', 'request_status' => 'approved',
        ]);

        $jobOrder = JobOrder::create([
            'request_id' => $request->id, 'status' => 'open', 'priority_level' => $priority,
        ]);
        $jobOrder->forceFill(['created_at' => $createdAt])->save();

        return $jobOrder;
    };

    $olderLow = $makeJobOrder('low', now()->subDays(3));
    $newerMedium = $makeJobOrder('medium', now()->subDay());
    $urgent = $makeJobOrder('urgent', now());

    $this->actingAs($admin)
        ->get(route('job-orders.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('job-orders/index')
            ->where('jobOrders.data.0.id', $urgent->id)
            ->where('jobOrders.data.1.id', $newerMedium->id)
            ->where('jobOrders.data.2.id', $olderLow->id));
});

test('response deadline counts only working hours monday to friday', function () {
    Mail::fake();

    $admin = wpAdmin();
    $requester = wpRequester();
    $category = ServiceCategory::firstOrCreate(['category_name' => 'Hardware']);
    ServiceType::firstOrCreate(['category_id' => $category->id, 'service_name' => 'PC Repair']);

    $request = ServiceRequest::create([
        'user_id' => $requester->id,
        'problem_description' => 'Slow computer',
        'request_status' => 'pending',
        'date_requested' => Carbon::parse('2026-10-30 16:00:00'),
    ]);

    $this->actingAs($admin)
        ->put(route('requests.update', $request), [
            'request_status' => 'approved',
            'priority_level' => 'medium',
        ])
        ->assertRedirect();

    expect($request->fresh()->sla_deadline->format('Y-m-d H:i'))->toBe('2026-11-04 13:00');
});

test('equipment out of service over five days is flagged for replacement', function () {
    $admin = wpAdmin();
    $requester = wpRequester();

    $request = ServiceRequest::create([
        'user_id' => $requester->id, 'problem_description' => 'Dead PC', 'request_status' => 'approved',
    ]);
    $jobOrder = JobOrder::create([
        'request_id' => $request->id, 'status' => 'in_progress',
        'assigned_to' => $admin->id, 'date_assigned' => now()->subDays(6),
    ]);

    expect($jobOrder->replacement_due)->toBeTrue();

    $jobOrder->update(['replacement_provided' => true]);
    expect($jobOrder->fresh()->replacement_due)->toBeFalse();
});

test('technicians store their expertise and it is listed for assignment', function () {
    $admin = wpAdmin();

    $this->actingAs($admin)
        ->post(route('technicians.store'), [
            'name' => 'Expert Tech',
            'department' => 'ICT Office',
            'expertise' => 'Networking and hardware repair',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('users', [
        'name' => 'Expert Tech',
        'expertise' => 'Networking and hardware repair',
        'is_technician' => true,
    ]);

    $this->actingAs($admin)
        ->get(route('job-orders.assignments'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('technicians', function ($technicians) {
                $technician = collect($technicians)->first(
                    fn ($technician) => data_get($technician, 'name') === 'Expert Tech',
                );

                return data_get($technician, 'expertise') === 'Networking and hardware repair';
            }));
});

test('assignment inherits the request priority and recalculates the sla', function () {
    Mail::fake();

    $admin = wpAdmin();
    $requester = wpRequester();
    $technician = wpAdmin();

    $request = ServiceRequest::create([
        'user_id' => $requester->id, 'problem_description' => 'Virus', 'request_status' => 'approved',
        'priority_level' => 'urgent',
    ]);
    $jobOrder = JobOrder::create(['request_id' => $request->id, 'status' => 'open']);

    $this->actingAs($admin)
        ->put(route('job-orders.assign', $jobOrder), ['assigned_to' => $technician->id])
        ->assertRedirect();

    $jobOrder->refresh();

    expect($jobOrder->priority_level)->toBe('urgent')
        ->and($jobOrder->sla_deadline)->not->toBeNull();
});

test('remote job order support cannot be saved without requester permission', function () {
    $admin = wpAdmin();
    $requester = wpRequester();
    $request = ServiceRequest::create([
        'user_id' => $requester->id,
        'problem_description' => 'Email setup',
        'request_status' => 'approved',
    ]);
    $jobOrder = JobOrder::create(['request_id' => $request->id, 'status' => 'open']);

    $this->actingAs($admin)
        ->put(route('job-orders.update', $jobOrder), [
            'status' => 'in_progress',
            'support_type' => 'remote',
            'user_permission_granted' => false,
        ])
        ->assertSessionHasErrors('user_permission_granted');

    expect($jobOrder->fresh()->support_type)->toBe('on_site')
        ->and($jobOrder->fresh()->status)->toBe('open');
});

test('remote job order support can be saved after requester permission is granted', function () {
    $admin = wpAdmin();
    $requester = wpRequester();
    $request = ServiceRequest::create([
        'user_id' => $requester->id,
        'problem_description' => 'Email setup',
        'request_status' => 'approved',
    ]);
    $jobOrder = JobOrder::create(['request_id' => $request->id, 'status' => 'open']);

    $this->actingAs($admin)
        ->put(route('job-orders.update', $jobOrder), [
            'status' => 'in_progress',
            'support_type' => 'remote',
            'user_permission_granted' => true,
        ])
        ->assertRedirect();

    expect($jobOrder->fresh()->support_type)->toBe('remote')
        ->and($jobOrder->fresh()->user_permission_granted)->toBeTrue();
});

test('an admin cannot close a job order until the requester verifies completion', function () {
    $admin = wpAdmin();
    $requester = wpRequester();
    $request = ServiceRequest::create([
        'user_id' => $requester->id,
        'problem_description' => 'Broken monitor',
        'request_status' => 'approved',
    ]);
    $jobOrder = JobOrder::create([
        'request_id' => $request->id,
        'status' => 'completed',
        'date_completed' => now(),
    ]);

    $this->actingAs($admin)
        ->put(route('job-orders.update', $jobOrder), [
            'status' => 'closed',
        ])
        ->assertSessionHasErrors('status');

    expect($jobOrder->fresh()->status)->toBe('completed');
});
