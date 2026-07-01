<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('DROP VIEW IF EXISTS pending_charity_approvals');
        DB::statement('DROP VIEW IF EXISTS active_visitation_schedule');
        DB::statement('DROP VIEW IF EXISTS visitation_statistics');

        Schema::dropIfExists('visitation_items');
        Schema::dropIfExists('visitation_denials');
        Schema::dropIfExists('visitation_rules');
        Schema::dropIfExists('visitation_sessions');
        Schema::dropIfExists('inmate_visitor_registrations');
        Schema::dropIfExists('visitors');

        Schema::create('visitors', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('full_name');
            $table->string('id_type');
            $table->string('id_number');
            $table->string('phone')->nullable();
            $table->timestamps();
        });

        Schema::create('visit_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('visitor_id')->constrained('visitors')->cascadeOnDelete();
            $table->foreignId('inmate_id')->nullable()->constrained('inmates')->nullOnDelete();
            $table->string('visit_type');
            $table->string('status')->default('checked_in');
            $table->timestamp('checked_in_at')->nullable();
            $table->timestamp('checked_out_at')->nullable();
            $table->string('denial_reason')->nullable();
            $table->text('denial_notes')->nullable();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->index(['inmate_id', 'status']);
            $table->index('checked_in_at');
        });

        Schema::create('visit_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('visit_session_id')->constrained('visit_sessions')->cascadeOnDelete();
            $table->string('item_description');
            $table->string('status')->default('pending');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('charity_bookings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('visit_session_id')->nullable()->constrained('visit_sessions')->nullOnDelete();
            $table->foreignId('inmate_id')->nullable()->constrained('inmates')->nullOnDelete();
            $table->string('organisation_name');
            $table->string('contact_person');
            $table->string('contact_person_phone');
            $table->string('inmate_category');
            $table->text('purpose');
            $table->date('proposed_date');
            $table->time('proposed_time');
            $table->integer('duration_minutes');
            $table->string('status')->default('pending');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->string('pdf_path')->nullable();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->index(['inmate_category', 'proposed_date', 'proposed_time']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('charity_bookings');
        Schema::dropIfExists('visit_items');
        Schema::dropIfExists('visit_sessions');
        Schema::dropIfExists('visitors');
    }
};
