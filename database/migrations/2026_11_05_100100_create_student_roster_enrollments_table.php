<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_roster_enrollments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_roster_id')->constrained('student_rosters')->cascadeOnDelete();
            $table->string('year_level', 20)->nullable();
            $table->string('registration_number', 100)->nullable();
            $table->string('academic_year', 50)->nullable();
            $table->string('semester', 50)->nullable();
            $table->string('status', 30)->default('enrolled');
            $table->timestamps();
            $table->index(['student_roster_id', 'academic_year', 'semester'], 'roster_enrollment_term_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_roster_enrollments');
    }
};
