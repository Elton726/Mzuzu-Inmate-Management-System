<?php
// database/migrations/2026_01_01_000004_create_admissions_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('inmates')) {
            Schema::create('inmates', function (Blueprint $table) {
                $table->id();
                $table->timestamps();
            });
        }

        if (Schema::hasTable('admissions')) {
            return;
        }

        Schema::create('admissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inmate_id')->constrained('inmates')->restrictOnDelete();
            $table->date('admission_date');
            $table->enum('admission_type', ['first_time', 'repeat']);
            $table->enum('inmate_type', ['convict', 'remandee', 'murder_remandee']);
            $table->string('case_number', 50);
            $table->string('court_name', 100)->nullable();
            $table->text('offence_description')->nullable();

            // Sentence details (only for convicts)
            $table->integer('sentence_years')->nullable();
            $table->integer('sentence_months')->nullable();
            $table->date('sentence_start_date')->nullable();
            $table->date('projected_release_date')->nullable();

            // Remand details (only for remandees)
            $table->date('remand_next_court_date')->nullable();

            // Warrant documents
            $table->string('committal_warrant_path', 255)->nullable();
            $table->string('remand_warrant_path', 255)->nullable();

            // Administrative fields
            $table->foreignId('admitted_by')->constrained('users')->restrictOnDelete();
            $table->boolean('is_current')->default(true);
            $table->date('released_at')->nullable();
            $table->string('release_reason', 50)->nullable();

            $table->timestamps();

            // Indexes
            $table->index('projected_release_date');
            $table->index(['inmate_id', 'is_current']);
        });

        // Ensure a single "current" admission per inmate.
        // Implemented as a partial unique index for portability and consistency
        // across database drivers (pgsql/sqlite).
        $driver = DB::getDriverName();
        if (in_array($driver, ['pgsql', 'sqlite'], true)) {
            $where = $driver === 'pgsql' ? 'is_current = true' : 'is_current = 1';
            DB::statement("CREATE UNIQUE INDEX IF NOT EXISTS admissions_unique_current_admission ON admissions(inmate_id) WHERE {$where}");
        }
    }

    public function down(): void
    {
        // Drop index first (if present) before dropping the table.
        try {
            DB::statement('DROP INDEX IF EXISTS admissions_unique_current_admission');
        } catch (\Throwable $e) {
            // Ignore for portability.
        }

        Schema::dropIfExists('admissions');
    }
};
