<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory_items', function (Blueprint $table) {
            $table->unsignedSmallInteger('acquisition_year')->nullable();
            $table->string('fund_cluster', 100)->nullable();
            $table->string('document_no', 100)->nullable();
            $table->string('unit_of_measure', 30)->nullable();
            $table->decimal('total_cost', 15, 2)->nullable();
            $table->date('sticker_date')->nullable();
            $table->string('supplier', 150)->nullable();
            $table->string('transfer_to', 150)->nullable();
            $table->string('shelf_life', 50)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('inventory_items', function (Blueprint $table) {
            $table->dropColumn([
                'acquisition_year',
                'fund_cluster',
                'document_no',
                'unit_of_measure',
                'total_cost',
                'sticker_date',
                'supplier',
                'transfer_to',
                'shelf_life',
            ]);
        });
    }
};
