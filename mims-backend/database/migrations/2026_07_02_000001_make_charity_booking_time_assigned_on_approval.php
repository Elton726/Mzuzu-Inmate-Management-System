<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE charity_bookings ALTER COLUMN proposed_time DROP NOT NULL');
        DB::statement('ALTER TABLE charity_bookings ALTER COLUMN duration_minutes DROP NOT NULL');
    }

    public function down(): void
    {
        DB::statement("UPDATE charity_bookings SET proposed_time = '09:00' WHERE proposed_time IS NULL");
        DB::statement('UPDATE charity_bookings SET duration_minutes = 60 WHERE duration_minutes IS NULL');
        DB::statement('ALTER TABLE charity_bookings ALTER COLUMN proposed_time SET NOT NULL');
        DB::statement('ALTER TABLE charity_bookings ALTER COLUMN duration_minutes SET NOT NULL');
    }
};
