<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('visit_sessions')) {
            return;
        }

        DB::table('visit_sessions')
            ->where('status', 'checked_in')
            ->whereNull('checked_out_at')
            ->update([
                'status' => 'in_progress',
                'checked_in_at' => DB::raw('COALESCE(checked_in_at, created_at)'),
                'updated_at' => now(),
            ]);

        if (! Schema::hasTable('visit_items')) {
            return;
        }

        DB::table('visit_sessions')
            ->whereNull('checked_out_at')
            ->whereExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('visit_items')
                    ->whereColumn('visit_items.visit_session_id', 'visit_sessions.id')
                    ->where('visit_items.status', 'flagged');
            })
            ->update([
                'status' => 'flagged',
                'checked_in_at' => DB::raw('COALESCE(checked_in_at, created_at)'),
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        if (! Schema::hasTable('visit_sessions')) {
            return;
        }

        DB::table('visit_sessions')
            ->where('status', 'in_progress')
            ->whereNull('checked_out_at')
            ->update([
                'status' => 'checked_in',
                'updated_at' => now(),
            ]);
    }
};
