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
        Schema::table('users', function (Blueprint $table) {
            $table->string('educational_level', 50)->nullable()->after('id_number');
            $table->string('year_level', 20)->nullable()->after('educational_level');
            $table->string('gender', 20)->nullable()->after('year_level');
            $table->date('birth_date')->nullable()->after('gender');
            $table->string('home_address', 255)->nullable()->after('birth_date');
            $table->string('cor_path', 500)->nullable()->after('home_address');
            $table->string('cor_original_name', 255)->nullable()->after('cor_path');
            $table->string('proof_type', 30)->nullable()->after('cor_original_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'educational_level',
                'year_level',
                'gender',
                'birth_date',
                'home_address',
                'cor_path',
                'cor_original_name',
                'proof_type',
            ]);
        });
    }
};
