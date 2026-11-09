<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('inventory_documents', function (Blueprint $table): void {
            $table->id();
            $table->char('identity_key', 64)->unique();
            $table->string('document_type', 10)->nullable()->index();
            $table->string('document_no', 100)->nullable();
            $table->timestamps();
        });
        Schema::create('inventory_document_lines', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('inventory_document_id')->constrained()->restrictOnDelete();
            $table->char('source_key', 64)->unique();
            $table->text('source_description')->nullable();
            $table->string('purchase_order_no', 150)->nullable();
            $table->string('fund_cluster', 100)->nullable();
            $table->string('supplier', 150)->nullable();
            $table->string('unit_of_measure', 30)->nullable();
            $table->decimal('unit_cost', 12, 2)->nullable();
            $table->decimal('total_cost', 15, 2)->nullable();
            $table->unsignedSmallInteger('document_quantity')->nullable();
            $table->timestamps();
        });
        Schema::create('asset_locations', function (Blueprint $table): void {
            $table->id();
            $table->char('identity_key', 64)->unique();
            $table->string('location', 150)->nullable();
            $table->string('campus', 100)->nullable();
            $table->string('building', 100)->nullable();
            $table->string('room', 100)->nullable();
            $table->string('specific_location', 150)->nullable();
            $table->timestamps();
        });
        Schema::create('asset_custodians', function (Blueprint $table): void {
            $table->id();
            $table->char('identity_key', 64)->unique();
            $table->string('name', 150)->nullable();
            $table->foreignId('department_id')->nullable()->constrained()->restrictOnDelete();
            $table->timestamps();
        });
        Schema::create('asset_assignments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('inventory_item_id')->constrained()->cascadeOnDelete();
            $table->foreignId('asset_custodian_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('asset_location_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('transfer_to', 150)->nullable();
            $table->timestamp('started_at');
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();
            $table->index(['inventory_item_id', 'ended_at']);
        });
        Schema::table('inventory_items', function (Blueprint $table): void {
            $table->foreignId('inventory_document_line_id')->nullable()->constrained()->restrictOnDelete();
        });

        DB::table('inventory_items')->orderBy('id')->chunkById(100, function ($items): void {
            foreach ($items as $item) {
                $fields = (array) $item;
                $documentValues = array_intersect_key($fields, array_flip($this->documentFields()));
                if (count(array_filter($documentValues, fn ($value) => $value !== null)) > 0) {
                    $documentId = $this->reference('inventory_documents', [
                        'identity_key' => hash('sha256', json_encode(filled($item->document_no)
                            ? [$item->document_type, $item->document_no] : ['asset', $item->id], JSON_THROW_ON_ERROR)),
                        'document_type' => $item->document_type, 'document_no' => $item->document_no,
                    ]);
                    $line = array_intersect_key($fields, array_flip($this->lineFields()));
                    $line['source_description'] = $item->description;
                    $line['inventory_document_id'] = $documentId;
                    foreach (['unit_cost', 'total_cost'] as $money) {
                        $line[$money] = $line[$money] === null ? null : number_format((float) $line[$money], 2, '.', '');
                    }
                    $line['document_quantity'] = $line['document_quantity'] === null ? null : (int) $line['document_quantity'];
                    ksort($line);
                    $line['source_key'] = hash('sha256', json_encode($line, JSON_THROW_ON_ERROR));
                    $lineId = $this->reference('inventory_document_lines', $line, 'source_key');
                    DB::table('inventory_items')->where('id', $item->id)->update(['inventory_document_line_id' => $lineId]);
                }
                $assignment = array_intersect_key($fields, array_flip($this->assignmentFields()));
                if (count(array_filter($assignment, fn ($value) => $value !== null)) > 0) {
                    $location = array_intersect_key($fields, array_flip($this->locationFields()));
                    ksort($location);
                    $locationId = count(array_filter($location, fn ($value) => $value !== null)) > 0
                        ? $this->reference('asset_locations', ['identity_key' => hash('sha256', json_encode($location, JSON_THROW_ON_ERROR)), ...$location]) : null;
                    $departmentId = filled($item->department)
                        ? (DB::table('departments')->where('name', $item->department)->value('id')
                            ?? DB::table('departments')->insertGetId(['name' => $item->department, 'created_at' => now(), 'updated_at' => now()])) : null;
                    $custodianId = $item->end_user !== null || $departmentId !== null
                        ? $this->reference('asset_custodians', [
                            'identity_key' => hash('sha256', json_encode([$item->end_user, $departmentId], JSON_THROW_ON_ERROR)),
                            'name' => $item->end_user, 'department_id' => $departmentId,
                        ]) : null;
                    DB::table('asset_assignments')->insert([
                        'inventory_item_id' => $item->id, 'asset_location_id' => $locationId,
                        'asset_custodian_id' => $custodianId, 'transfer_to' => $item->transfer_to,
                        'started_at' => $item->created_at ?? now(), 'created_at' => now(), 'updated_at' => now(),
                    ]);
                }
            }
        });
        Schema::table('inventory_items', function (Blueprint $table): void {
            $table->dropIndex(['document_type']);
        });
        Schema::table('inventory_items', function (Blueprint $table): void {
            $table->dropColumn([...$this->documentFields(), ...$this->assignmentFields()]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_items', function (Blueprint $table): void {
            foreach (['document_type' => 10, 'document_no' => 100, 'purchase_order_no' => 150, 'fund_cluster' => 100, 'supplier' => 150, 'unit_of_measure' => 30,
                'end_user' => 150, 'department' => 100, 'location' => 150, 'campus' => 100, 'building' => 100, 'room' => 100, 'specific_location' => 150, 'transfer_to' => 150] as $name => $length) {
                $table->string($name, $length)->nullable();
            }
            $table->decimal('unit_cost', 12, 2)->nullable();
            $table->decimal('total_cost', 15, 2)->nullable();
            $table->unsignedSmallInteger('document_quantity')->nullable();
            $table->index('document_type');
        });
        DB::table('inventory_items')->orderBy('id')->chunkById(100, function ($items): void {
            foreach ($items as $item) {
                $values = [];
                $line = DB::table('inventory_document_lines')->where('id', $item->inventory_document_line_id)->first();
                if ($line !== null) {
                    $document = DB::table('inventory_documents')->where('id', $line->inventory_document_id)->first();
                    $values = ['document_type' => $document->document_type, 'document_no' => $document->document_no,
                        ...array_intersect_key((array) $line, array_flip($this->lineFields()))];
                }
                $assignment = DB::table('asset_assignments')->where('inventory_item_id', $item->id)->whereNull('ended_at')->orderByDesc('id')->first();
                if ($assignment !== null) {
                    $location = DB::table('asset_locations')->where('id', $assignment->asset_location_id)->first();
                    $custodian = DB::table('asset_custodians')->where('id', $assignment->asset_custodian_id)->first();
                    $values = [...$values, ...array_intersect_key((array) $location, array_flip($this->locationFields())),
                        'end_user' => $custodian?->name, 'transfer_to' => $assignment->transfer_to,
                        'department' => DB::table('departments')->where('id', $custodian?->department_id)->value('name')];
                }
                if ($values !== []) {
                    DB::table('inventory_items')->where('id', $item->id)->update($values);
                }
            }
        });
        Schema::table('inventory_items', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('inventory_document_line_id');
        });
        Schema::dropIfExists('asset_assignments');
        Schema::dropIfExists('asset_custodians');
        Schema::dropIfExists('asset_locations');
        Schema::dropIfExists('inventory_document_lines');
        Schema::dropIfExists('inventory_documents');
    }

    /** @param array<string, mixed> $attributes */
    private function reference(string $table, array $attributes, string $key = 'identity_key'): int
    {
        return DB::table($table)->where($key, $attributes[$key])->value('id')
            ?? DB::table($table)->insertGetId([...$attributes, 'created_at' => now(), 'updated_at' => now()]);
    }

    /** @return list<string> */
    private function lineFields(): array
    {
        return ['purchase_order_no', 'fund_cluster', 'supplier', 'unit_of_measure', 'unit_cost', 'total_cost', 'document_quantity'];
    }

    /** @return list<string> */
    private function documentFields(): array
    {
        return ['document_type', 'document_no', ...$this->lineFields()];
    }

    /** @return list<string> */
    private function locationFields(): array
    {
        return ['location', 'campus', 'building', 'room', 'specific_location'];
    }

    /** @return list<string> */
    private function assignmentFields(): array
    {
        return ['end_user', 'department', ...$this->locationFields(), 'transfer_to'];
    }
};
