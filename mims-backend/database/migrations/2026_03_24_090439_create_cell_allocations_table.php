<?php
// database/migrations/2026_01_01_000006_create_cell_allocations_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('cells')) {
            Schema::create('cells', function (Blueprint $table) {
                $table->id();
                $table->string('cell_number', 20)->unique();
                $table->string('block', 10);
                $table->enum('gender', ['male', 'female'])->default('male');
                $table->enum('security_classification', ['maximum', 'medium', 'minimum']);
                $table->unsignedInteger('capacity');
                $table->integer('current_occupancy')->default(0);
                $table->enum('status', ['available', 'full', 'maintenance'])->default('available');
                $table->timestamps();

                $table->index(['security_classification', 'status']);
                $table->index(['gender', 'security_classification', 'status']);
            });
        }

        if (Schema::hasTable('cell_allocations')) {
            return;
        }

        Schema::create('cell_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inmate_id')->constrained('inmates')->cascadeOnDelete();
            $table->foreignId('admission_id')->constrained('admissions')->cascadeOnDelete();
            $table->foreignId('cell_id')->constrained('cells')->restrictOnDelete();
            $table->date('allocated_date');
            $table->date('deallocated_date')->nullable();
            $table->string('reason', 100)->nullable();
            $table->timestamps();

            // Indexes
            $table->index(['inmate_id', 'admission_id']);
        });

        // Only one active allocation per inmate+admission (deallocated_date IS NULL).
        $driver = DB::getDriverName();
        if (in_array($driver, ['pgsql', 'sqlite'], true)) {
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS cell_allocations_unique_active ON cell_allocations(inmate_id, admission_id) WHERE deallocated_date IS NULL');
        }
    }

    public function down(): void
    {
        try {
            DB::statement('DROP INDEX IF EXISTS cell_allocations_unique_active');
        } catch (\Throwable $e) {
            // Ignore for portability.
        }

        Schema::dropIfExists('cell_allocations');
    }
};
