<?php
// database/migrations/2026_01_01_000011_create_population_statistics_view.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // This migration can run before later inmate-column migrations when doing
        // `migrate:fresh` (lexicographic order). Only create the view once the
        // required columns exist.
        if (!Schema::hasTable('inmates') || !Schema::hasColumn('inmates', 'status') || !Schema::hasTable('admissions')) {
            return;
        }

        $driver = DB::getDriverName();
        if (!in_array($driver, ['pgsql', 'sqlite'], true)) {
            return;
        }

        // SQLite does not support CREATE OR REPLACE VIEW.
        DB::statement('DROP VIEW IF EXISTS population_statistics');

        $isCurrent = $driver === 'pgsql' ? 'a.is_current = true' : 'a.is_current = 1';

        DB::statement("
            CREATE VIEW population_statistics AS
            SELECT
                COUNT(DISTINCT i.id) AS total_inmates,
                COUNT(DISTINCT CASE WHEN a.inmate_type = 'convict' AND {$isCurrent} THEN i.id END) AS convict_count,
                COUNT(DISTINCT CASE WHEN a.inmate_type = 'remandee' AND {$isCurrent} THEN i.id END) AS remandee_count,
                COUNT(DISTINCT CASE WHEN a.inmate_type = 'murder_remandee' AND {$isCurrent} THEN i.id END) AS murder_remandee_count,
                COUNT(DISTINCT CASE WHEN i.status = 'active' THEN i.id END) AS active_inmates,
                COUNT(DISTINCT CASE WHEN i.status = 'released' THEN i.id END) AS released_inmates,
                COUNT(DISTINCT CASE WHEN i.status = 'deceased' THEN i.id END) AS deceased_inmates,
                COUNT(DISTINCT CASE WHEN i.status = 'transferred' THEN i.id END) AS transferred_inmates
            FROM inmates i
            LEFT JOIN admissions a ON i.id = a.inmate_id AND {$isCurrent}
        ");
    }

    public function down(): void
    {
        DB::statement('DROP VIEW IF EXISTS population_statistics');
    }
};
