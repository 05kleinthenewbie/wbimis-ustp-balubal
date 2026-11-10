<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('faculty_profiles', function (Blueprint $table): void {
            $table->string('id_number', 20)->nullable()->unique()->after('department_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('faculty_profiles', function (Blueprint $table): void {
            $table->dropUnique(['id_number']);
            $table->dropColumn('id_number');
        });
    }
};
