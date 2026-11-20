<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('service_types')
            ->where('service_name', 'Office 365')
            ->update(['service_name' => 'Microsoft 365']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('service_types')
            ->where('service_name', 'Microsoft 365')
            ->update(['service_name' => 'Office 365']);
    }
};
