<?php

use App\Models\AssetAssignment;
use App\Models\Department;
use App\Models\InventoryDocument;
use App\Models\InventoryDocumentLine;
use App\Models\InventoryItem;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

test('student and faculty facts have separate profile records and reference data', function () {
    $studentRole = Role::firstOrCreate(['role_name' => 'student']);
    $facultyRole = Role::firstOrCreate(['role_name' => 'faculty_staff']);
    $student = User::factory()->pendingApproval()->create([
        'role_id' => $studentRole->id, 'id_number' => '2023000001',
        'department' => 'BSIT', 'educational_level' => 'college', 'year_level' => '2',
    ]);
    $faculty = User::factory()->create([
        'role_id' => $facultyRole->id, 'department' => 'ICT Office',
        'employment_type' => 'non_teaching', 'position' => 'Staff',
    ]);
    $otherFaculty = User::factory()->create(['role_id' => $facultyRole->id, 'department' => 'ICT Office']);

    expect(Schema::hasColumn('users', 'department'))->toBeFalse()
        ->and(Schema::hasColumn('users', 'id_number'))->toBeFalse()
        ->and($student->fresh()->studentProfile->program->code)->toBe('BSIT')
        ->and($student->fresh()->facultyProfile)->toBeNull()
        ->and($faculty->fresh()->facultyProfile->department_id)->toBe($otherFaculty->fresh()->facultyProfile->department_id)
        ->and($student->fresh()->toArray()['id_number'])->toBe('2023000001')
        ->and($faculty->fresh()->toArray()['position'])->toBe('Staff');

    $student->update(['year_level' => '3']);
    expect($student->fresh()->studentProfile->year_level)->toBe('3');
    expect(Department::where('name', 'ICT Office')->count())->toBe(1);
});

test('approval compatibility flags are derived from the single stored status', function () {
    $user = User::factory()->pendingApproval()->create();
    expect(Schema::hasColumn('users', 'is_approved'))->toBeFalse()
        ->and($user->is_approved)->toBeFalse();
    $user->update(['is_approved' => true]);
    expect($user->fresh()->approval_status)->toBe('approved')
        ->and($user->fresh()->is_approved)->toBeTrue();
    $user->update(['approval_status' => 'rejected']);
    expect($user->fresh()->is_approved)->toBeFalse();
});

test('a profile constraint failure rolls back the account write', function () {
    $role = Role::firstOrCreate(['role_name' => 'student']);
    User::factory()->create(['role_id' => $role->id, 'id_number' => '2023000002']);
    $count = User::count();

    expect(fn () => User::factory()->create(['role_id' => $role->id, 'id_number' => '2023000002']))
        ->toThrow(QueryException::class);
    expect(User::count())->toBe($count);
});

test('individual assets share document and source-line facts without duplicating totals', function () {
    $facts = [
        'document_type' => 'ICS', 'document_no' => 'ICS-2026-001',
        'description' => 'Two matching desktop computers', 'unit_cost' => 10000,
        'total_cost' => 20000, 'document_quantity' => 2, 'unit_of_measure' => 'unit',
        'purchase_order_no' => 'PO-001', 'supplier' => 'Campus Supplier',
    ];
    $first = InventoryItem::factory()->create($facts);
    $second = InventoryItem::factory()->create($facts);

    expect(InventoryDocument::count())->toBe(1)
        ->and(InventoryDocumentLine::count())->toBe(1)
        ->and($first->fresh()->inventory_document_line_id)->toBe($second->fresh()->inventory_document_line_id)
        ->and(InventoryDocumentLine::sum('total_cost'))->toBe(20000)
        ->and($second->fresh()->toArray()['unit_cost'])->toBe('10000.00')
        ->and(Schema::hasColumn('inventory_items', 'document_no'))->toBeFalse();

    $first->update(['unit_cost' => 12000]);
    expect($first->fresh()->unit_cost)->toBe('12000.00')
        ->and($second->fresh()->unit_cost)->toBe('10000.00')
        ->and($first->fresh()->documentLine->document->id)->toBe($second->fresh()->documentLine->document->id);
});

test('asset transfers retain assignment history and reuse location and custodian records', function () {
    $item = InventoryItem::factory()->create([
        'end_user' => 'Office Custodian', 'department' => 'ICT Office',
        'location' => 'Computer Lab', 'campus' => 'Balubal Campus',
        'building' => null, 'room' => null, 'specific_location' => null,
    ]);
    $initial = $item->fresh()->currentAssignment;
    $this->travel(1)->minutes();
    $item->update(['location' => 'AV Room', 'end_user' => 'AV Custodian']);
    $current = $item->fresh()->currentAssignment;

    expect($item->assignments()->count())->toBe(2)
        ->and($initial->fresh()->ended_at)->not->toBeNull()
        ->and($current->ended_at)->toBeNull()
        ->and($current->custodian->name)->toBe('AV Custodian')
        ->and($current->location->location)->toBe('AV Room')
        ->and($item->fresh()->department)->toBe('ICT Office');

    $item->update(['end_user' => 'AV Custodian', 'location' => 'AV Room']);
    expect($item->assignments()->count())->toBe(2);
    $other = InventoryItem::factory()->create([
        'end_user' => 'AV Custodian', 'department' => 'ICT Office',
        'location' => 'AV Room', 'campus' => 'Balubal Campus',
        'building' => null, 'room' => null, 'specific_location' => null,
    ]);
    expect($other->fresh()->currentAssignment->asset_location_id)->toBe($current->asset_location_id)
        ->and($other->fresh()->currentAssignment->asset_custodian_id)->toBe($current->asset_custodian_id);
});

test('normalization migrations preserve existing profile and asset values through rollback and backfill', function () {
    $role = Role::firstOrCreate(['role_name' => 'student']);
    $user = User::factory()->pendingApproval()->create([
        'role_id' => $role->id, 'department' => 'BSIT', 'id_number' => '2023000003',
        'educational_level' => 'college', 'year_level' => '4',
    ]);
    $item = InventoryItem::factory()->create([
        'document_type' => 'PAR', 'document_no' => 'PAR-001',
        'unit_cost' => 100, 'total_cost' => 200, 'document_quantity' => 2,
        'department' => 'ICT Office', 'end_user' => 'Custodian', 'location' => 'Main Office',
    ]);
    $inventory = require database_path('migrations/2026_11_09_000915_normalize_inventory_documents_and_assignments.php');
    $accounts = require database_path('migrations/2026_11_09_000914_normalize_account_profiles_and_approval_state.php');

    $inventory->down();
    $accounts->down();
    expect(DB::table('users')->where('id', $user->id)->value('id_number'))->toBe('2023000003')
        ->and(DB::table('inventory_items')->where('id', $item->id)->value('document_no'))->toBe('PAR-001');
    $accounts->up();
    $inventory->up();

    expect($user->fresh()->id_number)->toBe('2023000003')
        ->and($user->fresh()->department)->toBe('BSIT')
        ->and($user->fresh()->approval_status)->toBe('pending')
        ->and($item->fresh()->document_no)->toBe('PAR-001')
        ->and($item->fresh()->unit_cost)->toBe('100.00')
        ->and($item->fresh()->total_cost)->toBe('200.00')
        ->and($item->fresh()->document_quantity)->toBe(2)
        ->and($item->fresh()->end_user)->toBe('Custodian')
        ->and($item->fresh()->department)->toBe('ICT Office')
        ->and($item->fresh()->location)->toBe('Main Office');
    $item->refresh()->update(['unit_cost' => 100]);
    expect(InventoryDocumentLine::count())->toBe(1)
        ->and(AssetAssignment::count())->toBe(1);
});
