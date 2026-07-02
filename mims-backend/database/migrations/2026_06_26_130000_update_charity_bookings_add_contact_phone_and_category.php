<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('charity_bookings')) {
            return;
        }

        Schema::table('charity_bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('charity_bookings', 'contact_person_phone')) {
                $table->string('contact_person_phone')->nullable()->after('contact_person');
            }

            if (!Schema::hasColumn('charity_bookings', 'inmate_category')) {
                $table->string('inmate_category')->nullable()->after('contact_person_phone');
            }
        });

        if (Schema::hasColumn('charity_bookings', 'inmate_id')) {
            if (DB::getDriverName() !== 'sqlite') {
                DB::statement('ALTER TABLE charity_bookings ALTER COLUMN inmate_id DROP NOT NULL');
            } else {
                Schema::table('charity_bookings', function (Blueprint $table) {
                    $table->unsignedBigInteger('inmate_id')->nullable()->change();
                });
            }
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('charity_bookings')) {
            return;
        }

        Schema::table('charity_bookings', function (Blueprint $table) {
            if (Schema::hasColumn('charity_bookings', 'contact_person_phone')) {
                $table->dropColumn('contact_person_phone');
            }

            if (Schema::hasColumn('charity_bookings', 'inmate_category')) {
                $table->dropColumn('inmate_category');
            }
        });
    }
};
