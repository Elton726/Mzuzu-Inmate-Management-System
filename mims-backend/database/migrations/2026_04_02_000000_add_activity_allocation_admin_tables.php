<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Create activity_categories table
        Schema::create('activity_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50)->unique();
            $table->text('description')->nullable();
            $table->timestamps(0);
        });

        // Add category_id to activities
        Schema::table('activities', function (Blueprint $table) {
            $table->foreignId('category_id')->nullable()->constrained('activity_categories')->nullOnDelete();
            $table->string('source_type', 20)->default('predefined');
            $table->string('security_level', 20)->default('medium');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('modified_by')->nullable()->constrained('users')->nullOnDelete();
        });

        // Create external_activity_details table
        Schema::create('external_activity_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('activity_id')->constrained()->onDelete('cascade');
            $table->string('location', 255);
            $table->string('external_partner', 255)->nullable();
            $table->boolean('requires_transport')->default(false);
            $table->text('transport_details')->nullable();
            $table->text('safety_requirements')->nullable();
            $table->text('supervisor_requirements')->nullable();
            $table->timestamps(0);

            $table->unique('activity_id');
        });

        // Create officer_duty_rosters table
        Schema::create('officer_duty_rosters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('officer_id')->constrained('users')->onDelete('restrict');
            $table->date('duty_week_start');
            $table->date('duty_week_end');
            $table->string('shift_type', 20);
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->constrained('users')->onDelete('restrict');
            $table->timestamps(0);

            $table->index(['officer_id', 'duty_week_start']);
            $table->unique(['officer_id', 'duty_week_start', 'shift_type'], 'unique_officer_duty');
        });

        // Create activity_assignment_logs table
        Schema::create('activity_assignment_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inmate_activity_id')->constrained('inmate_activities')->onDelete('cascade');
            $table->foreignId('assigned_by')->constrained('users')->onDelete('restrict');
            $table->string('assignment_reason', 255)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps(0);

            $table->index('inmate_activity_id');
        });

        // Add fields to users table
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_eligible_for_duty')->default(false);
            $table->json('duty_preferences')->nullable();
        });

        // Seed default categories
        $now = now();
        DB::table('activity_categories')->insert([
            [
                'name' => 'Internal Predefined',
                'description' => 'Standard internal activities like Kitchen, Tailoring',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Internal Custom',
                'description' => 'Custom internal activities created by admin',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'External',
                'description' => 'External activities like community service',
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);

        // Add check constraints (PostgreSQL only; SQLite in-memory tests don't support this syntax).
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE activities ADD CONSTRAINT activities_source_type_check CHECK (source_type IN ('predefined', 'custom'))");
            DB::statement("ALTER TABLE activities ADD CONSTRAINT activities_security_level_check CHECK (security_level IN ('low', 'medium', 'high'))");
            DB::statement("ALTER TABLE officer_duty_rosters ADD CONSTRAINT officer_duty_rosters_shift_type_check CHECK (shift_type IN ('morning', 'afternoon', 'night'))");
            DB::statement("ALTER TABLE officer_duty_rosters ADD CONSTRAINT officer_duty_rosters_week_range_check CHECK (duty_week_end >= duty_week_start)");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop check constraints
        DB::statement("ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_source_type_check");
        DB::statement("ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_security_level_check");
        DB::statement("ALTER TABLE officer_duty_rosters DROP CONSTRAINT IF EXISTS officer_duty_rosters_shift_type_check");
        DB::statement("ALTER TABLE officer_duty_rosters DROP CONSTRAINT IF EXISTS officer_duty_rosters_week_range_check");

        // Drop tables
        Schema::dropIfExists('activity_assignment_logs');
        Schema::dropIfExists('officer_duty_rosters');
        Schema::dropIfExists('external_activity_details');

        // Remove columns from activities
        Schema::table('activities', function (Blueprint $table) {
            $table->dropForeign(['category_id']);
            $table->dropColumn(['category_id', 'source_type', 'security_level', 'created_by', 'modified_by']);
        });

        // Remove columns from users
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['is_eligible_for_duty', 'duty_preferences']);
        });

        // Drop activity_categories
        Schema::dropIfExists('activity_categories');
    }
};
