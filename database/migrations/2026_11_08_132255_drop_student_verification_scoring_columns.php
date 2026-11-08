<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The verification application is now purely manual review: no parsed
     * identity claims or scoring results are stored alongside documents.
     */
    public function up(): void
    {
        Schema::table('student_verifications', function (Blueprint $table): void {
            $table->dropUnique(['approved_student_number']);
            $table->dropIndex(['student_number']);
            $table->dropIndex(['verification_score', 'created_at']);
        });

        Schema::table('student_verifications', function (Blueprint $table): void {
            $table->dropColumn([
                'student_number',
                'approved_student_number',
                'extracted_name',
                'course_code',
                'verification_results',
                'verification_score',
                'recommendation',
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('student_verifications', function (Blueprint $table): void {
            $table->string('student_number', 15)->nullable();
            $table->index('student_number');
            $table->string('approved_student_number', 15)->nullable()->unique();
            $table->string('extracted_name')->nullable();
            $table->string('course_code', 10)->nullable();
            $table->json('verification_results')->nullable();
            $table->unsignedSmallInteger('verification_score')->default(0);
            $table->string('recommendation', 30)->nullable();
            $table->index(['verification_score', 'created_at']);
        });
    }
};
