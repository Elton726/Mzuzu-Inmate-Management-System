<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Truncate any existing case_number values that exceed the new max of 5 characters
        DB::statement("UPDATE admissions SET case_number = SUBSTRING(case_number, 1, 5) WHERE LENGTH(case_number) > 5");

        Schema::table('admissions', function (Blueprint $table) {
            // 1. Shrink case_number column to the new max of 5 characters
            if (DB::getDriverName() !== 'sqlite') {
                $table->string('case_number', 5)->change();
            }

            // 2. Add sentence_days alongside the existing sentence_months (left null per user request)
            if (!Schema::hasColumn('admissions', 'sentence_days')) {
                $table->integer('sentence_days')->nullable()->after('sentence_months');
            }
        });

        // 3. Unique case_number per inmate (not system-wide)
        $driver = DB::getDriverName();
        try {
            if ($driver === 'mysql' || $driver === 'mariadb') {
                $existing = DB::select(
                    "SHOW INDEX FROM admissions WHERE Key_name = 'admissions_inmate_case_number_unique'"
                );
                if (empty($existing)) {
                    DB::statement(
                        'CREATE UNIQUE INDEX admissions_inmate_case_number_unique ON admissions(inmate_id, case_number)'
                    );
                }
            } elseif ($driver === 'pgsql') {
                DB::statement(
                    'CREATE UNIQUE INDEX IF NOT EXISTS admissions_inmate_case_number_unique ON admissions(inmate_id, case_number)'
                );
            } elseif ($driver === 'sqlite') {
                DB::statement(
                    'CREATE UNIQUE INDEX IF NOT EXISTS admissions_inmate_case_number_unique ON admissions(inmate_id, case_number)'
                );
            }
        } catch (\Throwable $e) {
            // Index may already exist; safe to ignore.
        }
    }

    public function down(): void
    {
        Schema::table('admissions', function (Blueprint $table) {
            // Restore original column length
            if (DB::getDriverName() !== 'sqlite') {
                $table->string('case_number', 50)->change();
            }

            if (Schema::hasColumn('admissions', 'sentence_days')) {
                $table->dropColumn('sentence_days');
            }
        });

        try {
            $driver = DB::getDriverName();
            if ($driver === 'mysql' || $driver === 'mariadb') {
                DB::statement('DROP INDEX admissions_inmate_case_number_unique ON admissions');
            } else {
                DB::statement('DROP INDEX IF EXISTS admissions_inmate_case_number_unique');
            }
        } catch (\Throwable $e) {
            // Ignore.
        }
    }
};
