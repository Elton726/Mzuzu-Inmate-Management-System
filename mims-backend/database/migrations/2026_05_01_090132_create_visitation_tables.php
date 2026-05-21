<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Visitors table
        Schema::create('visitors', function (Blueprint $table) {
            $table->id();
            $table->string('first_name', 50);
            $table->string('last_name', 50);
            $table->string('relationship', 50);
            $table->string('contact_number', 20);
            $table->string('national_id', 20)->nullable();
            $table->string('email', 100)->nullable();
            $table->boolean('is_approved')->default(false);
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps(0);
        });

        // 2. Inmate-Visitor Registrations (approved visitors for each inmate)
        Schema::create('inmate_visitor_registrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inmate_id')->constrained('inmates')->onDelete('cascade');
            $table->foreignId('visitor_id')->constrained('visitors')->onDelete('cascade');
            $table->date('registered_date');
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps(0);
        });

        // 3. Visitation Sessions (with charity fields – Option A)
        Schema::create('visitation_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inmate_id')->constrained('inmates')->onDelete('cascade');
            $table->foreignId('visitor_id')->constrained('visitors')->onDelete('cascade');
            $table->foreignId('admission_id')->constrained('admissions')->onDelete('cascade');
            $table->date('visit_date');
            $table->time('visit_time');
            $table->integer('duration_minutes')->nullable();
            $table->string('location', 100)->nullable();
            $table->foreignId('supervising_officer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 20)->default('scheduled');
            $table->string('visit_purpose', 255)->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('checked_in_at')->nullable();
            $table->timestamp('checked_out_at')->nullable();

            // Charity booking fields (Option A)
            $table->boolean('is_charity_visit')->default(false);
            $table->string('charity_organization', 255)->nullable();
            $table->text('charity_purpose')->nullable();
            $table->string('pdf_file_path', 255)->nullable();
            $table->timestamp('pdf_generated_at')->nullable();
            $table->foreignId('pdf_created_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps(0);

            // Indexes for performance
            $table->index(['inmate_id', 'visit_date']);
            $table->index('visitor_id');
            $table->index('supervising_officer_id');
            $table->index('status');
        });

        // 4. Visitation Rules (per inmate restrictions)
        Schema::create('visitation_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inmate_id')->constrained('inmates')->onDelete('cascade');
            $table->string('rule_type', 50);
            $table->text('description');
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->constrained('users')->onDelete('restrict');
            $table->timestamps(0);
        });

        // 5. Visitation Denials / Cancellations
        Schema::create('visitation_denials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('visitation_session_id')->constrained('visitation_sessions')->onDelete('cascade');
            $table->string('reason', 255);
            $table->foreignId('denied_by')->constrained('users')->onDelete('restrict');
            $table->timestamp('denial_date')->default(DB::raw('CURRENT_TIMESTAMP'));
            $table->text('notes')->nullable();
            $table->timestamps(0);
        });

        // 6. Visitation Items (gifts/items brought by visitors)
        Schema::create('visitation_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('visitation_session_id')->constrained('visitation_sessions')->onDelete('cascade');
            $table->text('item_description');
            $table->string('item_category', 50);
            $table->integer('quantity')->default(1);
            $table->foreignId('inspected_by')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_approved')->default(true);
            $table->text('inspection_notes')->nullable();
            $table->timestamps(0);
        });

        // 7. Add CHECK constraints (PostgreSQL specific)
        DB::statement("ALTER TABLE visitors ADD CONSTRAINT visitors_relationship_check CHECK (relationship IN ('family', 'friend', 'legal_representative', 'social_worker', 'charity_representative', 'other'))");
        DB::statement("ALTER TABLE visitation_sessions ADD CONSTRAINT visitation_sessions_status_check CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'))");
        DB::statement("ALTER TABLE visitation_rules ADD CONSTRAINT visitation_rules_type_check CHECK (rule_type IN ('restricted_visitors', 'contact_only', 'supervised_only', 'no_visitation'))");
        DB::statement("ALTER TABLE visitation_items ADD CONSTRAINT visitation_items_category_check CHECK (item_category IN ('food', 'clothing', 'reading_material', 'toiletries', 'documents', 'other'))");

        // 8. Create views
        DB::statement("
            CREATE VIEW visitation_statistics AS
            SELECT
                i.id AS inmate_id,
                i.first_name,
                i.last_name,
                i.prison_number,
                COUNT(DISTINCT vs.id) AS total_visits,
                COUNT(DISTINCT CASE WHEN vs.status = 'completed' THEN vs.id END) AS completed_visits,
                MAX(vs.visit_date) AS last_visit_date,
                COUNT(DISTINCT vs.visitor_id) AS unique_visitors
            FROM inmates i
            LEFT JOIN visitation_sessions vs ON i.id = vs.inmate_id
            GROUP BY i.id, i.first_name, i.last_name, i.prison_number
        ");

        DB::statement("
            CREATE VIEW active_visitation_schedule AS
            SELECT
                vs.id,
                i.prison_number,
                CONCAT(i.first_name, ' ', i.last_name) AS inmate_name,
                CONCAT(v.first_name, ' ', v.last_name) AS visitor_name,
                v.relationship,
                vs.visit_date,
                vs.visit_time,
                vs.status,
                u.name AS supervising_officer,
                vs.is_charity_visit,
                vs.charity_organization
            FROM visitation_sessions vs
            JOIN inmates i ON vs.inmate_id = i.id
            JOIN visitors v ON vs.visitor_id = v.id
            LEFT JOIN users u ON vs.supervising_officer_id = u.id
            WHERE vs.visit_date >= CURRENT_DATE AND vs.status IN ('scheduled', 'in_progress')
            ORDER BY vs.visit_date, vs.visit_time
        ");

        // 9. Charity visits pending approval view (optional but useful)
        DB::statement("
            CREATE VIEW pending_charity_approvals AS
            SELECT
                vs.id AS session_id,
                i.prison_number,
                CONCAT(i.first_name, ' ', i.last_name) AS inmate_name,
                vs.charity_organization,
                vs.charity_purpose,
                vs.visit_date,
                vs.pdf_file_path,
                vs.created_at AS requested_at
            FROM visitation_sessions vs
            JOIN inmates i ON vs.inmate_id = i.id
            WHERE vs.is_charity_visit = true
              AND vs.status = 'scheduled'
              AND vs.pdf_file_path IS NOT NULL
              AND vs.status != 'completed'
            ORDER BY vs.created_at
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop views
        DB::statement('DROP VIEW IF EXISTS pending_charity_approvals');
        DB::statement('DROP VIEW IF EXISTS active_visitation_schedule');
        DB::statement('DROP VIEW IF EXISTS visitation_statistics');

        // Drop tables (order matters due to foreign keys)
        Schema::dropIfExists('visitation_items');
        Schema::dropIfExists('visitation_denials');
        Schema::dropIfExists('visitation_rules');
        Schema::dropIfExists('visitation_sessions');
        Schema::dropIfExists('inmate_visitor_registrations');
        Schema::dropIfExists('visitors');

        // Note: CHECK constraints are automatically dropped with the tables
    }
};
