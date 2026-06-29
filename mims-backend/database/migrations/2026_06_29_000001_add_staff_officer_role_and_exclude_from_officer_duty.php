<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Ensure the staff_officer role exists for user creation.
        DB::table('roles')->insertOrIgnore([
            'name' => 'staff_officer',
            'description' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Ensure the officer duty roster uniqueness is weekly-only (already migrated in a previous migration).
        // This migration is intentionally lightweight; roster uniqueness is enforced by the unique index on duty_week_start.

        // Ensure officer on duty roster logic excludes officer_on_duty users (not available manually).
        // The actual enforcement is done in code/validation; this migration just adds the missing role.
    }

    public function down(): void
    {
        // Keep the role record on rollback to avoid breaking existing data.
    }
};

