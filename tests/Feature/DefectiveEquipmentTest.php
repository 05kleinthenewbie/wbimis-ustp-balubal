<?php

use App\Models\DefectiveEquipment;
use App\Models\InventoryItem;
use App\Models\Role;
use App\Models\User;

function defectiveAdmin(): User
{
    $role = Role::firstOrCreate(['role_name' => 'ict_admin']);

    return User::factory()->create(['role_id' => $role->id]);
}

function defectiveFaculty(): User
{
    $role = Role::firstOrCreate(['role_name' => 'faculty']);

    return User::factory()->create(['role_id' => $role->id]);
}

test('admin can flag an item as defective', function () {
    $admin = defectiveAdmin();
    $item = InventoryItem::factory()->create(['condition' => 'working']);

    $response = $this->actingAs($admin)->post(
        route('inventory.defective.store', $item->id),
        ['damage_description' => 'Screen flickers on power-up.'],
    );

    $response->assertRedirect();
    $response->assertSessionHas('status');

    $this->assertDatabaseHas('defective_equipment', [
        'item_id' => $item->id,
        'damage_description' => 'Screen flickers on power-up.',
        'repair_status' => 'pending',
    ]);

    $this->assertDatabaseHas('inventory_items', [
        'id' => $item->id,
        'condition' => 'defective',
    ]);

    $this->assertDatabaseHas('audit_logs', [
        'module_name' => 'inventory_items',
        'record_id' => $item->id,
        'action_taken' => 'Flagged item as defective',
    ]);
});

test('flagging as defective requires a damage description', function () {
    $admin = defectiveAdmin();
    $item = InventoryItem::factory()->create();

    $response = $this->actingAs($admin)->post(
        route('inventory.defective.store', $item->id),
        ['damage_description' => ''],
    );

    $response->assertSessionHasErrors('damage_description');
    $this->assertDatabaseCount('defective_equipment', 0);
});

test('non admins cannot flag items as defective', function () {
    $faculty = defectiveFaculty();
    $item = InventoryItem::factory()->create();

    $this->actingAs($faculty)->post(
        route('inventory.defective.store', $item->id),
        ['damage_description' => 'Broken.'],
    )->assertForbidden();

    $this->assertDatabaseCount('defective_equipment', 0);
});

test('admin can update a defect repair status', function () {
    $admin = defectiveAdmin();
    $item = InventoryItem::factory()->create(['condition' => 'defective']);
    $record = DefectiveEquipment::create([
        'item_id' => $item->id,
        'damage_description' => 'Dead unit.',
        'repair_status' => 'pending',
        'date_reported' => now(),
    ]);

    $response = $this->actingAs($admin)->patch(
        route('inventory.defective.update', [$item->id, $record->id]),
        ['repair_status' => 'in_progress'],
    );

    $response->assertRedirect();
    $this->assertDatabaseHas('defective_equipment', [
        'id' => $record->id,
        'repair_status' => 'in_progress',
    ]);
});

test('marking a repair completed restores the item condition to working', function () {
    $admin = defectiveAdmin();
    $item = InventoryItem::factory()->create(['condition' => 'defective']);
    $record = DefectiveEquipment::create([
        'item_id' => $item->id,
        'damage_description' => 'Dead unit.',
        'repair_status' => 'in_progress',
        'date_reported' => now(),
    ]);

    $this->actingAs($admin)
        ->patch(
            route('inventory.defective.update', [$item->id, $record->id]),
            ['repair_status' => 'completed'],
        )
        ->assertRedirect();

    $this->assertDatabaseHas('defective_equipment', [
        'id' => $record->id,
        'repair_status' => 'completed',
    ]);

    $this->assertDatabaseHas('inventory_items', [
        'id' => $item->id,
        'condition' => 'working',
    ]);
});

test('repair status update rejects unknown statuses', function () {
    $admin = defectiveAdmin();
    $item = InventoryItem::factory()->create();
    $record = DefectiveEquipment::create([
        'item_id' => $item->id,
        'damage_description' => 'Dead unit.',
        'repair_status' => 'pending',
        'date_reported' => now(),
    ]);

    $response = $this->actingAs($admin)->patch(
        route('inventory.defective.update', [$item->id, $record->id]),
        ['repair_status' => 'scrapped'],
    );

    $response->assertSessionHasErrors('repair_status');
});

test('repair status can only be updated on the item own defect records', function () {
    $admin = defectiveAdmin();
    $item = InventoryItem::factory()->create();
    $otherItem = InventoryItem::factory()->create();
    $record = DefectiveEquipment::create([
        'item_id' => $otherItem->id,
        'damage_description' => 'Other item defect.',
        'repair_status' => 'pending',
        'date_reported' => now(),
    ]);

    $this->actingAs($admin)
        ->patch(
            route('inventory.defective.update', [$item->id, $record->id]),
            ['repair_status' => 'completed'],
        )
        ->assertNotFound();
});
