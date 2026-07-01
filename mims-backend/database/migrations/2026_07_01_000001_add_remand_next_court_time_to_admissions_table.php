<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('admissions', function (Blueprint $table) {
            if (!Schema::hasColumn('admissions', 'remand_next_court_time')) {
                $table->time('remand_next_court_time')->nullable()->after('remand_next_court_date');
            }
        });
    }

    public function down(): void
    {
        Schema::table('admissions', function (Blueprint $table) {
            if (Schema::hasColumn('admissions', 'remand_next_court_time')) {
                $table->dropColumn('remand_next_court_time');
            }
        });
    }
};
