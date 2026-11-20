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
        Schema::table('facilities', function (Blueprint $table) {
            $table->string('facility_type', 50)->default('computer_lab')->change();
        });

        DB::table('facilities')
            ->where('facility_type', 'av_room')
            ->update(['facility_type' => 'classroom']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('facilities')
            ->where('facility_type', 'office')
            ->update(['facility_type' => 'computer_lab']);

        DB::table('facilities')
            ->where('facility_type', 'classroom')
            ->update(['facility_type' => 'av_room']);

        Schema::table('facilities', function (Blueprint $table) {
            $table->enum('facility_type', ['computer_lab', 'av_room'])->default('computer_lab')->change();
        });
    }
};
