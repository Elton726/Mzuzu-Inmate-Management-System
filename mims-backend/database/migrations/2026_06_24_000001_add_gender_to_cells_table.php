<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('cells') || Schema::hasColumn('cells', 'gender')) {
            return;
        }

        Schema::table('cells', function (Blueprint $table) {
            $table->enum('gender', ['male', 'female'])->default('male')->after('block');
            $table->index(['gender', 'security_classification', 'status']);
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('cells') || !Schema::hasColumn('cells', 'gender')) {
            return;
        }

        Schema::table('cells', function (Blueprint $table) {
            $table->dropIndex(['gender', 'security_classification', 'status']);
            $table->dropColumn('gender');
        });
    }
};
