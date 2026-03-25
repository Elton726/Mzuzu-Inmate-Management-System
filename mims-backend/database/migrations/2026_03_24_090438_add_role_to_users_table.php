<?php
// database/migrations/2026_01_01_000002_add_role_to_users_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Keep idempotent: this migration was created after an earlier
        // `add_role_to_users_table` migration and may run in the same project
        // during `migrate:fresh` (sqlite) even if the columns already exist.
        if (Schema::hasColumn('users', 'role_id')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('role_id')->nullable()->after('email')
                  ->constrained('roles')
                  ->nullOnDelete();
            $table->boolean('is_active')->default(true)->after('role_id');
            $table->timestamp('last_login')->nullable()->after('is_active');
        });
    }

    public function down(): void
    {
        if (!Schema::hasColumn('users', 'role_id')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            try {
                $table->dropForeign(['role_id']);
            } catch (\Throwable $e) {
                // Ignore for portability (sqlite/tests).
            }

            $table->dropColumn(['role_id', 'is_active', 'last_login']);
        });
    }
};
