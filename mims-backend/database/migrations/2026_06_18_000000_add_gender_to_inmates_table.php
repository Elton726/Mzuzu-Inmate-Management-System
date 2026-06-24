<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inmates', function (Blueprint $table) {
            if (!Schema::hasColumn('inmates', 'gender')) {
                $table->string('gender', 20)->nullable()->after('date_of_birth');
            }
        });
    }

    public function down(): void
    {
        Schema::table('inmates', function (Blueprint $table) {
            if (Schema::hasColumn('inmates', 'gender')) {
                $table->dropColumn('gender');
            }
        });
    }
};
