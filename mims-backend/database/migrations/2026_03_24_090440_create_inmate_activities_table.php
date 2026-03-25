<?php
// database/migrations/2026_01_01_000008_create_inmate_activities_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inmate_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inmate_id')->constrained('inmates')->cascadeOnDelete();
            $table->foreignId('admission_id')->constrained('admissions')->cascadeOnDelete();
            $table->foreignId('activity_id')->constrained('activities')->restrictOnDelete();
            $table->date('assigned_date');
            $table->date('end_date')->nullable();
            $table->foreignId('assigned_by')->constrained('users')->restrictOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();

            // Indexes
            $table->index(['inmate_id', 'admission_id']);
        });

        // Only one active activity assignment per inmate+admission (end_date IS NULL).
        $driver = DB::getDriverName();
        if (in_array($driver, ['pgsql', 'sqlite'], true)) {
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS inmate_activities_unique_active ON inmate_activities(inmate_id, admission_id) WHERE end_date IS NULL');
        }
    }

    public function down(): void
    {
        try {
            DB::statement('DROP INDEX IF EXISTS inmate_activities_unique_active');
        } catch (\Throwable $e) {
            // Ignore for portability.
        }

        Schema::dropIfExists('inmate_activities');
    }
};
