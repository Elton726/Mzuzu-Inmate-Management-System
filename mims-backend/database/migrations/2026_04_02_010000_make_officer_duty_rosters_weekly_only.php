<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Drop existing shift-type constraint first (PostgreSQL) so we can normalize existing data.
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE officer_duty_rosters DROP CONSTRAINT IF EXISTS officer_duty_rosters_shift_type_check");
        }

        // Normalize existing rows (older versions used morning/afternoon/night).
        DB::table('officer_duty_rosters')->update(['shift_type' => 'full_day']);

        // If there are multiple rows per week (old shift-based approach), keep the earliest and delete the rest
        // so we can enforce unique(duty_week_start).
        $duplicates = DB::table('officer_duty_rosters')
            ->select('duty_week_start', DB::raw('MIN(id) as keep_id'), DB::raw('COUNT(*) as cnt'))
            ->groupBy('duty_week_start')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        foreach ($duplicates as $dup) {
            DB::table('officer_duty_rosters')
                ->whereDate('duty_week_start', $dup->duty_week_start)
                ->where('id', '!=', $dup->keep_id)
                ->delete();
        }

        // Ensure we only have one "on duty" officer per week (no shifts).
        Schema::table('officer_duty_rosters', function (Blueprint $table) {
            // Old unique included shift_type; keep column for now but enforce week uniqueness.
            try {
                $table->dropUnique('unique_officer_duty');
            } catch (\Throwable $e) {
                // Ignore if it doesn't exist (already migrated).
            }
            $table->unique('duty_week_start', 'unique_duty_week_start');
        });

        // Re-add shift_type constraint for PostgreSQL: only full_day is allowed.
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE officer_duty_rosters ADD CONSTRAINT officer_duty_rosters_shift_type_check CHECK (shift_type IN ('full_day'))");
        }
    }

    public function down(): void
    {
        // Best-effort rollback (original shift data is not recoverable). Keep shift_type as 'morning'.
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE officer_duty_rosters DROP CONSTRAINT IF EXISTS officer_duty_rosters_shift_type_check");
        }

        DB::table('officer_duty_rosters')->update(['shift_type' => 'morning']);

        Schema::table('officer_duty_rosters', function (Blueprint $table) {
            $table->dropUnique('unique_duty_week_start');
            $table->unique(['officer_id', 'duty_week_start', 'shift_type'], 'unique_officer_duty');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE officer_duty_rosters ADD CONSTRAINT officer_duty_rosters_shift_type_check CHECK (shift_type IN ('morning', 'afternoon', 'night'))");
        }
    }
};
