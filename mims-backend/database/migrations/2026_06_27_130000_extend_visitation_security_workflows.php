<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('visit_sessions', function (Blueprint $table) {
            if (! Schema::hasColumn('visit_sessions', 'expected_checkout_at')) {
                $table->timestamp('expected_checkout_at')->nullable()->after('checked_out_at');
                $table->index('expected_checkout_at');
            }
        });

        Schema::table('charity_bookings', function (Blueprint $table) {
            if (! Schema::hasColumn('charity_bookings', 'approval_notes')) {
                $table->text('approval_notes')->nullable()->after('approved_at');
            }

            if (! Schema::hasColumn('charity_bookings', 'rejection_reason')) {
                $table->text('rejection_reason')->nullable()->after('approval_notes');
            }

            if (! Schema::hasColumn('charity_bookings', 'rejected_by')) {
                $table->foreignId('rejected_by')->nullable()->after('rejection_reason')->constrained('users')->nullOnDelete();
            }

            if (! Schema::hasColumn('charity_bookings', 'rejected_at')) {
                $table->timestamp('rejected_at')->nullable()->after('rejected_by');
            }
        });

        Schema::create('visit_session_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('visit_session_id')->nullable()->constrained('visit_sessions')->cascadeOnDelete();
            $table->string('event_type');
            $table->text('description')->nullable();
            $table->json('metadata')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['visit_session_id', 'created_at']);
            $table->index('event_type');
        });

        Schema::create('visit_item_flag_reviews', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('visit_item_id')->constrained('visit_items')->cascadeOnDelete();
            $table->foreignUuid('visit_session_id')->constrained('visit_sessions')->cascadeOnDelete();
            $table->string('status')->default('pending');
            $table->string('resolution')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->unique(['visit_item_id', 'status']);
        });

        Schema::create('visitor_inmate_relationships', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('visitor_id')->constrained('visitors')->cascadeOnDelete();
            $table->foreignId('inmate_id')->constrained('inmates')->cascadeOnDelete();
            $table->string('relationship_type');
            $table->text('notes')->nullable();
            $table->boolean('is_approved')->default(false);
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            $table->unique(['visitor_id', 'inmate_id']);
            $table->index(['inmate_id', 'relationship_type']);
        });

        Schema::create('visitation_notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->string('recipient_role')->nullable();
            $table->string('title');
            $table->text('message');
            $table->string('type')->default('info');
            $table->string('action_url')->nullable();
            $table->json('data')->nullable();
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['recipient_role', 'is_read', 'created_at']);
            $table->index(['user_id', 'is_read', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('visitation_notifications');
        Schema::dropIfExists('visitor_inmate_relationships');
        Schema::dropIfExists('visit_item_flag_reviews');
        Schema::dropIfExists('visit_session_events');

        Schema::table('charity_bookings', function (Blueprint $table) {
            if (Schema::hasColumn('charity_bookings', 'rejected_by')) {
                $table->dropConstrainedForeignId('rejected_by');
            }

            foreach (['rejected_at', 'rejection_reason', 'approval_notes'] as $column) {
                if (Schema::hasColumn('charity_bookings', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::table('visit_sessions', function (Blueprint $table) {
            if (Schema::hasColumn('visit_sessions', 'expected_checkout_at')) {
                $table->dropIndex(['expected_checkout_at']);
                $table->dropColumn('expected_checkout_at');
            }
        });
    }
};
