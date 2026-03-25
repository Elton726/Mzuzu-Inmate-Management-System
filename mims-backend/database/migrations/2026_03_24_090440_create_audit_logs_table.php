<?php
// database/migrations/2026_01_01_000010_create_audit_logs_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 50);
            $table->string('table_name', 50);
            $table->unsignedBigInteger('record_id')->nullable();
            $table->json('old_data')->nullable();
            $table->json('new_data')->nullable();
            $table->ipAddress('ip_address')->nullable();
            $table->timestamps();

            // Indexes
            $table->index(['user_id', 'created_at']);
            $table->index('table_name');
            $table->index('record_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
