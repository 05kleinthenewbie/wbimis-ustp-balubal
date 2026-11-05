<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * proof_type was originally introduced by editing the already-executed
     * 2026_10_26_084523 migration, so environments that ran it earlier get
     * the column here. The guard keeps fresh installations from failing on
     * a duplicate column.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'proof_type')) {
                $table->string('proof_type', 30)->nullable()->after('cor_original_name');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'proof_type')) {
                $table->dropColumn('proof_type');
            }
        });
    }
};
