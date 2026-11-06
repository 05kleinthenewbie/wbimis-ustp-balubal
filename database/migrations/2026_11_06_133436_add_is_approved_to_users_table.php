<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add the admin approval flag to user accounts. Accounts that existed
     * before this workflow (already active with a verified email) are kept
     * approved; every new registration starts unapproved.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'is_approved')) {
                $table->boolean('is_approved')->default(false)->after('email_verified_at');
            }
            if (! Schema::hasIndex('users', 'users_is_approved_email_verified_at_index')) {
                $table->index(['is_approved', 'email_verified_at']);
            }
        });

        DB::table('users')
            ->where('status', 'active')
            ->whereNotNull('email_verified_at')
            ->update(['is_approved' => true]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['is_approved', 'email_verified_at']);
            $table->dropColumn('is_approved');
        });
    }
};
