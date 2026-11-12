<?php

use App\Models\AuditLog;
use App\Models\Role;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

function auditLogAdmin(string $name = 'Ada Admin'): User
{
    $role = Role::firstOrCreate(['role_name' => 'ict_admin']);

    return User::factory()->create(['role_id' => $role->id, 'name' => $name]);
}

function auditLogFaculty(): User
{
    $role = Role::firstOrCreate(['role_name' => 'faculty']);

    return User::factory()->create(['role_id' => $role->id]);
}

function makeAuditLog(User $actor, array $overrides = []): AuditLog
{
    return AuditLog::create([
        'admin_user_id' => $actor->id,
        'action_taken' => 'Added inventory item',
        'module_name' => 'inventory_items',
        'record_id' => 1,
        'action_date' => now(),
        'details' => null,
        ...$overrides,
    ]);
}

test('guests are redirected to the login page from the audit log', function () {
    $this->get(route('audit-log.index'))->assertRedirect(route('login'));
});

test('faculty cannot view the audit log', function () {
    $faculty = auditLogFaculty();

    $this->actingAs($faculty)->get(route('audit-log.index'))->assertForbidden();
});

test('ict admins see the audit log index with its stats', function () {
    $admin = auditLogAdmin();

    makeAuditLog($admin);

    $response = $this->actingAs($admin)->get(route('audit-log.index'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('audit-log/index')
        ->has('logs.data', 1)
        ->where('stats.total', 1)
        ->where('stats.today', 1)
        ->where('stats.active_admins', 1)
        ->where('stats.modules', 1)
        ->has('suggestions', 2),
    );
});

test('audit log search suggestions contain actions, actors and details without duplicates', function () {
    $admin = auditLogAdmin('Ada Admin');
    $other = auditLogAdmin('Ben Admin');

    makeAuditLog($admin, ['action_taken' => 'Added inventory item', 'details' => 'Laptop unit L-001']);
    makeAuditLog($admin, ['action_taken' => 'Added inventory item']);
    makeAuditLog($other, ['action_taken' => 'Deleted inventory item', 'module_name' => 'inventory_items']);

    $response = $this->actingAs($admin)->get(route('audit-log.index'));

    $suggestions = $response->viewData('page')['props']['suggestions'];

    $values = array_column($suggestions, 'value');
    $types = collect($suggestions)->mapWithKeys(fn (array $suggestion) => [
        $suggestion['value'] => $suggestion['type'],
    ]);

    expect($values)->toContain('Added inventory item', 'Deleted inventory item', 'Ada Admin', 'Laptop unit L-001')
        ->and(array_unique($values))->toBe($values)
        ->and($types['Added inventory item'])->toBe('action')
        ->and($types['Ada Admin'])->toBe('actor')
        ->and($types['Laptop unit L-001'])->toBe('details');
});

test('the audit log search suggestions are ordered actions first, then actors, then details', function () {
    $admin = auditLogAdmin('Ada Admin');

    makeAuditLog($admin, ['action_taken' => 'Set user status to active', 'details' => 'Some detail']);

    $suggestions = $this->actingAs($admin)
        ->get(route('audit-log.index'))
        ->viewData('page')['props']['suggestions'];

    expect(array_column($suggestions, 'type'))->toBe(['action', 'actor', 'details']);
});
