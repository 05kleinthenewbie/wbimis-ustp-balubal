<?php

use App\Models\AuditLog;
use App\Models\Role;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

function auditFilterUser(string $roleName): User
{
    $role = Role::firstOrCreate(['role_name' => $roleName]);

    return User::factory()->create([
        'role_id' => $role->id,
        'status' => 'active',
    ]);
}

function auditFilterLog(User $actor, array $overrides = []): AuditLog
{
    return AuditLog::create([
        'admin_user_id' => $actor->id,
        'action_taken' => 'Created facility "Computer Lab A"',
        'module_name' => 'facilities',
        'record_id' => 1,
        'action_date' => now(),
        'details' => null,
        ...$overrides,
    ]);
}

test('audit logs can be filtered by user', function () {
    $admin = auditFilterUser('ict_admin');
    $other = auditFilterUser('ict_admin');

    auditFilterLog($admin);
    auditFilterLog($other);

    $this->actingAs($admin)
        ->get('/audit-log?user_id='.$other->id)
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('audit-log/index')
            ->where('filters.user_id', (string) $other->id)
            ->has('logs.data', 1)
            ->where('logs.data.0.admin_user.name', $other->name));
});

test('audit logs can be filtered by action status', function () {
    $admin = auditFilterUser('ict_admin');

    auditFilterLog($admin, ['action_taken' => 'Created facility "Computer Lab A"']);
    auditFilterLog($admin, ['action_taken' => 'Updated facility "Computer Lab A"']);
    auditFilterLog($admin, ['action_taken' => 'Deleted facility "Computer Lab A"']);

    $this->actingAs($admin)
        ->get('/audit-log?status=updated')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.status', 'updated')
            ->has('logs.data', 1)
            ->where('logs.data.0.action_taken', 'Updated facility "Computer Lab A"'));
});

test('audit logs can be filtered by date range', function () {
    $admin = auditFilterUser('ict_admin');

    auditFilterLog($admin, [
        'action_date' => now()->subDays(5),
        'action_taken' => 'Created old record',
    ]);
    auditFilterLog($admin, [
        'action_date' => now(),
        'action_taken' => 'Created new record',
    ]);

    $this->actingAs($admin)
        ->get('/audit-log?date_from='.now()->toDateString())
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('logs.data', 1)
            ->where('logs.data.0.action_taken', 'Created new record'));
});

test('audit logs store and expose previous and new values', function () {
    $admin = auditFilterUser('ict_admin');

    $this->actingAs($admin);

    AuditLog::record(
        'Set user status to active',
        'users',
        $admin->id,
        null,
        ['status' => 'pending'],
        ['status' => 'active'],
    );

    $this->actingAs($admin)
        ->get('/audit-log')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('logs.data', 1)
            ->where('logs.data.0.old_values.status', 'pending')
            ->where('logs.data.0.new_values.status', 'active'));
});

test('non-admins cannot view the audit log', function () {
    $faculty = auditFilterUser('faculty');

    $this->actingAs($faculty)->get('/audit-log')->assertForbidden();
});
