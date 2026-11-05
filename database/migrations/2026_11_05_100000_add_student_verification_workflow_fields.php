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
            // Environments that already ran the 2026_10_26_100622 migration
            // after it was edited have this column; skip on duplicate.
            if (! Schema::hasColumn('users', 'identity_verification_status')) {
                $table->string('identity_verification_status', 30)->nullable()->after('cor_verification_status');
                $table->index('identity_verification_status');
            }
            $table->string('registration_review_status', 30)->nullable()->after('cor_verification_status');
            $table->index('registration_review_status');
            $table->text('registration_review_reason')->nullable()->after('registration_review_status');
            $table->foreignId('registration_reviewed_by')->nullable()->after('registration_review_reason')->constrained('users')->nullOnDelete();
            $table->timestamp('registration_reviewed_at')->nullable()->after('registration_reviewed_by');
            $table->index(['status', 'role_id', 'registration_review_status'], 'users_student_review_filter_index');
        });

        Schema::create('student_verification_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('admin_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('verification_method', 50);
            $table->string('result', 30);
            $table->text('failure_reason')->nullable();
            $table->json('details')->nullable();
            $table->timestamp('verified_at');
            $table->timestamps();
            $table->index(['user_id', 'verified_at']);
        });

        Schema::create('student_approval_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('admin_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('student_id_number', 20)->nullable();
            $table->string('action', 30);
            $table->text('reason')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'created_at']);
            $table->index(['student_id_number', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_approval_logs');
        Schema::dropIfExists('student_verification_logs');

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('users_student_review_filter_index');
            $table->dropConstrainedForeignId('registration_reviewed_by');
            $table->dropColumn([
                'registration_review_status',
                'registration_review_reason',
                'registration_reviewed_at',
                'identity_verification_status',
            ]);
        });
    }
};
