<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Remove the student-verification workflow and document-upload columns
     * and tables that are no longer used after the registration review step
     * was removed.
     */
    public function up(): void
    {
        // Drop dead tables (order matters for the roster enrollment foreign key).
        Schema::dropIfExists('student_roster_enrollments');
        Schema::dropIfExists('student_rosters');
        Schema::dropIfExists('student_verification_logs');
        Schema::dropIfExists('student_approval_logs');
        Schema::dropIfExists('student_login_codes');

        // Drop indexes on the columns being removed first; SQLite cannot drop
        // an indexed column directly.
        Schema::table('users', function (Blueprint $table) {
            foreach ([
                'users_employee_id_number_unique',
                'users_identity_verification_status_index',
                'users_registration_review_status_index',
                'users_student_review_filter_index',
            ] as $index) {
                if (Schema::hasIndex('users', $index)) {
                    $table->dropIndex($index);
                }
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'registration_reviewed_by')) {
                $table->dropConstrainedForeignId('registration_reviewed_by');
            }

            foreach ([
                'cor_path',
                'cor_original_name',
                'proof_type',
                'cor_verification_status',
                'identity_verification_status',
                'cor_verification_details',
                'cor_checked_at',
                'registration_review_status',
                'registration_review_reason',
                'registration_reviewed_at',
                'employee_id_number',
                'employment_document_path',
                'employment_document_original_name',
            ] as $column) {
                if (Schema::hasColumn('users', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }

    /**
     * This cleanup is intentionally not reversible; the removed data was
     * never used by the simplified registration flow.
     */
    public function down(): void
    {
        //
    }
};
