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
            if (! Schema::hasColumn('visitors', 'is_watchlisted')) {
                $table->boolean('is_watchlisted')->default(false)->after('phone');
            }

            if (! Schema::hasColumn('visitors', 'watchlist_reason')) {
                $table->text('watchlist_reason')->nullable()->after('is_watchlisted');
            }

            if (! Schema::hasColumn('visitors', 'watchlisted_by')) {
                $table->foreignId('watchlisted_by')->nullable()->after('watchlist_reason')->constrained('users')->nullOnDelete();
            }

            if (! Schema::hasColumn('visitors', 'watchlisted_at')) {
                $table->timestamp('watchlisted_at')->nullable()->after('watchlisted_by');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('visitors')) {
            return;
        }

        Schema::table('visitors', function (Blueprint $table) {
            if (Schema::hasColumn('visitors', 'watchlisted_by')) {
                $table->dropConstrainedForeignId('watchlisted_by');
            }

            foreach (['watchlisted_at', 'watchlist_reason', 'is_watchlisted'] as $column) {
                if (Schema::hasColumn('visitors', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
