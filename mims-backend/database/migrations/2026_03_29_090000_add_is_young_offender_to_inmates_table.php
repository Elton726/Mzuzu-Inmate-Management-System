<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inmates', function (Blueprint $table) {
            if (Schema::hasColumn('inmates', 'is_young_offender')) {
                return;
            }

            $table->boolean('is_young_offender')->default(false)->after('date_of_birth');
            $table->index('is_young_offender');
        });
    }

    public function down(): void
    {
        Schema::table('inmates', function (Blueprint $table) {
            if (!Schema::hasColumn('inmates', 'is_young_offender')) {
                return;
            }

            $table->dropIndex(['is_young_offender']);
            $table->dropColumn('is_young_offender');
        });
    }
};

