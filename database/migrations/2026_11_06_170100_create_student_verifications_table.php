<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * One application per student account; documents live on the private
     * local disk and are only served through the application.
     */
    public function up(): void
    {
        Schema::create('student_verifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('student_number', 15)->nullable();
            $table->index('student_number');
            $table->string('approved_student_number', 15)->nullable()->unique();
            $table->string('extracted_name')->nullable();
            $table->string('course_code', 10)->nullable();
            $table->string('student_id_file_path')->nullable();
            $table->string('cor_file_path')->nullable();
            $table->json('verification_results')->nullable();
            $table->unsignedSmallInteger('verification_score')->default(0);
            $table->string('recommendation', 30)->nullable();
            $table->text('review_notes')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
            $table->index(['verification_score', 'created_at']);
        });

        DB::table('users')->whereIn('role_id', DB::table('roles')->select('id')->where('role_name', 'student'))
            ->where('approval_status', 'approved')->whereNotNull('id_number')
            ->orderBy('id')->chunkById(100, function ($users): void {
                foreach ($users as $user) {
                    if (preg_match('/^\d{10}$/', $user->id_number) !== 1) {
                        continue;
                    }
                    DB::table('student_verifications')->insert([
                        'user_id' => $user->id, 'student_number' => $user->id_number,
                        'approved_student_number' => $user->id_number,
                        'created_at' => now(), 'updated_at' => now(),
                    ]);
                }
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_verifications');
    }
};
