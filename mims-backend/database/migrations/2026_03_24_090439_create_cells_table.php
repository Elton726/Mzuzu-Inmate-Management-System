<?php
// database/migrations/2026_01_01_000005_create_cells_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('cells')) {
            return;
        }

        Schema::create('cells', function (Blueprint $table) {
            $table->id();
            $table->string('cell_number', 20)->unique();
            $table->string('block', 10);
            $table->enum('gender', ['male', 'female'])->default('male');
            $table->enum('security_classification', ['maximum', 'medium', 'minimum']);
            // Keep portable across pgsql/sqlite: use unsigned integer without a DB-specific check constraint.
            $table->unsignedInteger('capacity');
            $table->integer('current_occupancy')->default(0);
            $table->enum('status', ['available', 'full', 'maintenance'])->default('available');
            $table->timestamps();

            // Indexes
            $table->index(['security_classification', 'status']);
            $table->index(['gender', 'security_classification', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cells');
    }
};
