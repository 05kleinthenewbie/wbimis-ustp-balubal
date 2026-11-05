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
            $table->string('cor_verification_status')->nullable();
            $table->string('identity_verification_status')->nullable();
            $table->json('cor_verification_details')->nullable();
            $table->timestamp('cor_checked_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['cor_verification_status', 'identity_verification_status', 'cor_verification_details', 'cor_checked_at']);
        });
    }
};
