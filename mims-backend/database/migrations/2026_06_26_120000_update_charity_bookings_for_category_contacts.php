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
                $table->string('inmate_category')->default('all')->after('contact_person_phone');
            }
        });

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE charity_bookings ALTER COLUMN inmate_id DROP NOT NULL');
            DB::statement("UPDATE charity_bookings SET inmate_category = 'all' WHERE inmate_category IS NULL OR inmate_category = ''");
            DB::statement("UPDATE charity_bookings SET contact_person_phone = '' WHERE contact_person_phone IS NULL");
            DB::statement('ALTER TABLE charity_bookings ALTER COLUMN contact_person_phone SET NOT NULL');
        } else {
            Schema::table('charity_bookings', function (Blueprint $table) {
                $table->unsignedBigInteger('inmate_id')->nullable()->change();
                $table->string('contact_person_phone')->nullable(false)->change();
            });
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('charity_bookings')) {
            return;
        }

        Schema::table('charity_bookings', function (Blueprint $table) {
            if (Schema::hasColumn('charity_bookings', 'inmate_category')) {
                $table->dropColumn('inmate_category');
            }

            if (Schema::hasColumn('charity_bookings', 'contact_person_phone')) {
                $table->dropColumn('contact_person_phone');
            }
        });
    }
};
