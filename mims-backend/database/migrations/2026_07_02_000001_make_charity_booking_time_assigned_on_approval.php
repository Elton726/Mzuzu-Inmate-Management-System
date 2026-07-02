<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE charity_bookings ALTER COLUMN proposed_time DROP NOT NULL');
            DB::statement('ALTER TABLE charity_bookings ALTER COLUMN duration_minutes DROP NOT NULL');
        } else {
            Schema::table('charity_bookings', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->time('proposed_time')->nullable()->change();
                $table->integer('duration_minutes')->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        DB::statement("UPDATE charity_bookings SET proposed_time = '09:00' WHERE proposed_time IS NULL");
        DB::statement('UPDATE charity_bookings SET duration_minutes = 60 WHERE duration_minutes IS NULL');
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE charity_bookings ALTER COLUMN proposed_time SET NOT NULL');
            DB::statement('ALTER TABLE charity_bookings ALTER COLUMN duration_minutes SET NOT NULL');
        } else {
            Schema::table('charity_bookings', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->time('proposed_time')->nullable(false)->change();
                $table->integer('duration_minutes')->nullable(false)->change();
            });
        }
    }
};
