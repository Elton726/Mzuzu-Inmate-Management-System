<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('admissions', function (Blueprint $table) {
            if (!Schema::hasColumn('admissions', 'remand_duration_days')) {
                $table->unsignedInteger('remand_duration_days')->nullable()->after('remand_next_court_date');
            }
        });
    }

    public function down(): void
    {
        Schema::table('admissions', function (Blueprint $table) {
            if (Schema::hasColumn('admissions', 'remand_duration_days')) {
                $table->dropColumn('remand_duration_days');
            }
        });
    }
};
