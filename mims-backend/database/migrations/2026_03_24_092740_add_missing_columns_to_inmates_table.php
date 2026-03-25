<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inmates', function (Blueprint $table) {
            // Add all missing columns
            $table->string('prison_number', 20)->unique()->after('id');
            $table->string('first_name', 50);
            $table->string('last_name', 50);
            $table->string('other_names', 100)->nullable();
            $table->date('date_of_birth');
            $table->string('place_of_birth', 100)->nullable();
            $table->string('nationality', 50)->default('Malawian');
            $table->string('national_id', 20)->nullable()->unique();
            $table->string('marital_status', 20)->nullable();
            $table->string('next_of_kin_name', 100)->nullable();
            $table->string('next_of_kin_contact', 50)->nullable();
            $table->string('photo_path', 255)->nullable();
            $table->enum('status', ['active', 'released', 'deceased', 'transferred'])
                  ->default('active');

            // Add indexes
            $table->index(['first_name', 'last_name', 'date_of_birth']);
        });

        // (Re)create the population statistics view now that the `inmates.status`
        // column exists (the view migration may have run earlier during migrate:fresh).
        $driver = DB::getDriverName();
        if (in_array($driver, ['pgsql', 'sqlite'], true) && Schema::hasTable('admissions')) {
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
    }

    public function down(): void
    {
        Schema::table('inmates', function (Blueprint $table) {
            // Drop the columns we added (if we need to rollback)
            $table->dropColumn([
                'prison_number', 'first_name', 'last_name', 'other_names',
                'date_of_birth', 'place_of_birth', 'nationality', 'national_id',
                'marital_status', 'next_of_kin_name', 'next_of_kin_contact',
                'photo_path', 'status'
            ]);
            // The unique constraints and indexes are automatically dropped with columns
        });
    }
};
