<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('visitors')) {
            return;
        }

        Schema::table('visitors', function (Blueprint $table) {
            if (Schema::hasColumn('visitors', 'id_type')) {
                $table->dropColumn('id_type');
            }

            if (Schema::hasColumn('visitors', 'id_number')) {
                $table->dropColumn('id_number');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('visitors')) {
            return;
        }

        Schema::table('visitors', function (Blueprint $table) {
            if (! Schema::hasColumn('visitors', 'id_type')) {
                $table->string('id_type')->nullable()->after('full_name');
            }

            if (! Schema::hasColumn('visitors', 'id_number')) {
                $table->string('id_number')->nullable()->after('id_type');
            }
        });
    }
};
