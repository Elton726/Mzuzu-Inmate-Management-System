<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('inmates', function (Blueprint $table) {
            if (!Schema::hasColumn('inmates', 'personal_belongings')) {
                $table->text('personal_belongings')->nullable()->after('next_of_kin_contact');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inmates', function (Blueprint $table) {
            if (Schema::hasColumn('inmates', 'personal_belongings')) {
                $table->dropColumn('personal_belongings');
            }
        });
    }
};
