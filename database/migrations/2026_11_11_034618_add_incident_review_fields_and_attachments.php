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
        Schema::table('incident_reports', function (Blueprint $table): void {
            $table->text('resolution_notes')->nullable()->after('status');
        });

        Schema::create('incident_attachments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('incident_id')->constrained('incident_reports')->cascadeOnDelete();
            $table->string('file_name');
            $table->string('file_path');
            $table->timestamp('uploaded_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('incident_attachments');

        Schema::table('incident_reports', function (Blueprint $table): void {
            $table->dropColumn('resolution_notes');
        });
    }
};
