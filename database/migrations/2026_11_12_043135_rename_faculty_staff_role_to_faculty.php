<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $legacy = DB::table('roles')->where('role_name', 'faculty_staff')->first();

        if ($legacy === null) {
            return;
        }

        $existing = DB::table('roles')->where('role_name', 'faculty')->first();

        if ($existing !== null) {
            DB::table('users')->where('role_id', $legacy->id)->update(['role_id' => $existing->id]);
            DB::table('roles')->where('id', $legacy->id)->delete();

            return;
        }

        DB::table('roles')->where('id', $legacy->id)->update(['role_name' => 'faculty']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $faculty = DB::table('roles')->where('role_name', 'faculty')->first();

        if ($faculty === null) {
            return;
        }

        $legacy = DB::table('roles')->where('role_name', 'faculty_staff')->first();

        if ($legacy !== null) {
            DB::table('users')->where('role_id', $faculty->id)->update(['role_id' => $legacy->id]);
            DB::table('roles')->where('id', $faculty->id)->delete();

            return;
        }

        DB::table('roles')->where('id', $faculty->id)->update(['role_name' => 'faculty_staff']);
    }
};
