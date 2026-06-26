<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('release_clearance_checklists') || !Schema::hasColumn('release_clearance_checklists', 'release_workflow_id')) {
            return;
        }

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE release_clearance_checklists ALTER COLUMN release_workflow_id DROP NOT NULL');
            return;
        }

        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement('ALTER TABLE release_clearance_checklists MODIFY release_workflow_id BIGINT UNSIGNED NULL');
    }

    public function down(): void
    {
        // Do not re-apply NOT NULL because pre-approval checklists legitimately have no workflow yet.
    }
};
