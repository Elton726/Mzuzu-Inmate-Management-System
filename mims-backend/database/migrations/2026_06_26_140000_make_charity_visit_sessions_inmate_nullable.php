<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('visit_sessions') && Schema::hasColumn('visit_sessions', 'inmate_id')) {
            DB::statement('ALTER TABLE visit_sessions ALTER COLUMN inmate_id DROP NOT NULL');
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('visit_sessions') && Schema::hasColumn('visit_sessions', 'inmate_id')) {
            DB::statement('ALTER TABLE visit_sessions ALTER COLUMN inmate_id SET NOT NULL');
        }
    }
};
