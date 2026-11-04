<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('inventory_items')->where('property_no', 'like', 'USTP-ICT-%')->delete();

        DB::table('inventory_items')
            ->where('property_no', 'PROP-001')
            ->where('category', 'Network Equipment')
            ->delete();

        DB::table('inventory_items')
            ->where('property_no', '2024-05-03-050019-57')
            ->where('category', 'Desktop')
            ->delete();
    }

    public function down(): void
    {
        //
    }
};
