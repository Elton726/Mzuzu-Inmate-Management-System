<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('visit_sessions') && Schema::hasColumn('visit_sessions', 'inmate_id')) {
            if (DB::getDriverName() !== 'sqlite') {
                DB::statement('ALTER TABLE visit_sessions ALTER COLUMN inmate_id DROP NOT NULL');
            } else {
                Schema::table('visit_sessions', function (Blueprint $table) {
                    $table->unsignedBigInteger('inmate_id')->nullable()->change();
                });
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('visit_sessions') && Schema::hasColumn('visit_sessions', 'inmate_id')) {
            if (DB::getDriverName() !== 'sqlite') {
                DB::statement('ALTER TABLE visit_sessions ALTER COLUMN inmate_id SET NOT NULL');
            } else {
                Schema::table('visit_sessions', function (Blueprint $table) {
                    $table->unsignedBigInteger('inmate_id')->nullable(false)->change();
                });
            }
        }
    }
};
