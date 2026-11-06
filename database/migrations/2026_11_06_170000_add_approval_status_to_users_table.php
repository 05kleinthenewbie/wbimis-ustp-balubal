<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Students are governed by document-verification approval states
     * (pending, approved, rejected). Faculty, staff and administrators keep
     * the existing is_approved flag; their approval_status stays null.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('approval_status', 20)->nullable()->after('is_approved');
            $table->index('approval_status');
        });

        DB::table('users')
            ->whereIn('role_id', DB::table('roles')->select('id')->where('role_name', 'student'))
            ->update([
                'approval_status' => DB::raw("CASE WHEN is_approved = 1 THEN 'approved' WHEN status = 'rejected' THEN 'rejected' ELSE 'pending' END"),
            ]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['approval_status']);
            $table->dropColumn('approval_status');
        });
    }
};
