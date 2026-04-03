<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private function supportsAlterTableAddConstraint(): bool
    {
        // SQLite does not support adding named CHECK constraints via ALTER TABLE.
        return DB::getDriverName() !== 'sqlite';
    }

    private function indexExists(string $table, string $indexName): bool
    {
        $driver = DB::getDriverName();

        return match ($driver) {
            'sqlite' => (bool) DB::scalar(
                "SELECT 1 FROM sqlite_master WHERE type = 'index' AND tbl_name = ? AND name = ? LIMIT 1",
                [$table, $indexName]
            ),
            'mysql', 'mariadb' => (bool) DB::scalar(
                "SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ? LIMIT 1",
                [$table, $indexName]
            ),
            'pgsql' => (bool) DB::scalar(
                "SELECT 1 FROM pg_indexes WHERE tablename = ? AND indexname = ? LIMIT 1",
                [$table, $indexName]
            ),
            default => false,
        };
    }

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // =============================================
        // 1. Create activity_categories table (if not exists)
        // =============================================
        if (!Schema::hasTable('activity_categories')) {
            Schema::create('activity_categories', function (Blueprint $table) {
                $table->id();
                $table->string('name', 50)->unique();
                $table->text('description')->nullable();
                $table->timestamps();
            });
        }

        // =============================================
        // 2. Add columns to existing activities table
        // =============================================
        Schema::table('activities', function (Blueprint $table) {
            if (!Schema::hasColumn('activities', 'category_id')) {
                $table->foreignId('category_id')->nullable()->after('activity_type')
                    ->constrained('activity_categories')->nullOnDelete();
            }
            if (!Schema::hasColumn('activities', 'source_type')) {
                $table->string('source_type', 20)->default('predefined')->after('category_id');
            }
            if (!Schema::hasColumn('activities', 'security_level')) {
                $table->string('security_level', 20)->default('medium')->after('source_type');
            }
            if (!Schema::hasColumn('activities', 'created_by')) {
                $table->foreignId('created_by')->nullable()->after('updated_at')
                    ->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('activities', 'modified_by')) {
                $table->foreignId('modified_by')->nullable()->after('created_by')
                    ->constrained('users')->nullOnDelete();
            }
        });

        // =============================================
        // 3. Create external_activity_details table (if not exists)
        // =============================================
        if (!Schema::hasTable('external_activity_details')) {
            Schema::create('external_activity_details', function (Blueprint $table) {
                $table->id();
                $table->foreignId('activity_id')->constrained('activities')->onDelete('cascade');
                $table->string('location', 255);
                $table->string('external_partner', 255)->nullable();
                $table->boolean('requires_transport')->default(false);
                $table->text('transport_details')->nullable();
                $table->text('safety_requirements')->nullable();
                $table->text('supervisor_requirements')->nullable();
                $table->timestamps();

                $table->unique('activity_id');
            });
        }

        // =============================================
        // 4. Create officer_duty_rosters table (if not exists)
        // =============================================
        if (!Schema::hasTable('officer_duty_rosters')) {
            Schema::create('officer_duty_rosters', function (Blueprint $table) {
                $table->id();
                $table->foreignId('officer_id')->constrained('users')->onDelete('restrict');
                $table->date('duty_week_start');
                $table->date('duty_week_end');
                $table->string('shift_type', 20);
                $table->boolean('is_active')->default(true);
                $table->foreignId('created_by')->constrained('users')->onDelete('restrict');
                $table->timestamps();

                $table->unique(['officer_id', 'duty_week_start', 'shift_type'], 'idx_officer_duty_unique');
            });

            if ($this->supportsAlterTableAddConstraint()) {
                DB::statement('ALTER TABLE officer_duty_rosters ADD CONSTRAINT duty_week_end_check CHECK (duty_week_end >= duty_week_start)');
                DB::statement("ALTER TABLE officer_duty_rosters ADD CONSTRAINT officer_duty_rosters_shift_type_check CHECK (shift_type IN ('morning', 'afternoon', 'night'))");
            }
        }

        // =============================================
        // 5. Create activity_sessions table (if not exists)
        // =============================================
        if (!Schema::hasTable('activity_sessions')) {
            Schema::create('activity_sessions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('activity_id')->constrained('activities')->onDelete('restrict');
                $table->date('session_date');
                $table->string('session_time', 20);
                $table->foreignId('supervising_officer_id')->constrained('users')->onDelete('restrict');
                $table->time('start_time')->nullable();
                $table->time('end_time')->nullable();
                $table->string('status', 50)->default('scheduled');
                $table->text('notes')->nullable();
                $table->foreignId('created_by')->constrained('users')->onDelete('restrict');
                $table->timestamps();

                $table->index('activity_id');
                $table->index('session_date');
                $table->index('supervising_officer_id');
            });

            if ($this->supportsAlterTableAddConstraint()) {
                DB::statement("ALTER TABLE activity_sessions ADD CONSTRAINT activity_sessions_status_check CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'))");
            }
        }

        // =============================================
        // 6. Create session_attendance table (if not exists)
        // =============================================
        if (!Schema::hasTable('session_attendance')) {
            Schema::create('session_attendance', function (Blueprint $table) {
                $table->id();
                $table->foreignId('session_id')->constrained('activity_sessions')->onDelete('cascade');
                $table->foreignId('inmate_id')->constrained('inmates')->onDelete('restrict');
                $table->foreignId('admission_id')->constrained('admissions')->onDelete('restrict');
                $table->string('attendance_status', 20)->default('present');
                $table->text('notes')->nullable();
                $table->foreignId('recorded_by')->constrained('users')->onDelete('restrict');
                $table->timestamp('recorded_at')->default(DB::raw('CURRENT_TIMESTAMP'));
                $table->timestamps();

                $table->index('session_id');
                $table->index('inmate_id');
                $table->index('admission_id');
                $table->unique(['session_id', 'inmate_id'], 'idx_attendance_unique');
            });

            if ($this->supportsAlterTableAddConstraint()) {
                DB::statement("ALTER TABLE session_attendance ADD CONSTRAINT session_attendance_status_check CHECK (attendance_status IN ('present', 'absent', 'late', 'excused'))");
            }
        }

        // =============================================
        // 7. Create activity_assignment_logs table (if not exists)
        // =============================================
        if (!Schema::hasTable('activity_assignment_logs')) {
            Schema::create('activity_assignment_logs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('inmate_activity_id')->constrained('inmate_activities')->onDelete('cascade');
                $table->foreignId('assigned_by')->constrained('users')->onDelete('restrict');
                $table->string('assignment_reason', 255)->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->index('inmate_activity_id');
            });
        }

        // =============================================
        // 8. Add columns to users table
        // =============================================
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'is_eligible_for_duty')) {
                $table->boolean('is_eligible_for_duty')->default(false)->after('is_active');
            }
            if (!Schema::hasColumn('users', 'duty_preferences')) {
                $table->json('duty_preferences')->nullable()->after('is_eligible_for_duty');
            }
        });

        // =============================================
        // 9. Add indexes on existing tables for performance
        // =============================================
        Schema::table('inmate_activities', function (Blueprint $table) {
            if (!$this->indexExists('inmate_activities', 'idx_inmate_activities_end_date')) {
                $table->index('end_date', 'idx_inmate_activities_end_date');
            }
        });

        // =============================================
        // 10. Create useful views (drop and recreate)
        // =============================================

        DB::statement('DROP VIEW IF EXISTS current_duty_roster');
        DB::statement("
            CREATE VIEW current_duty_roster AS
            SELECT
                odr.id,
                u.id AS officer_id,
                u.name AS officer_name,
                odr.duty_week_start,
                odr.duty_week_end,
                odr.shift_type
            FROM officer_duty_rosters odr
            JOIN users u ON u.id = odr.officer_id
            WHERE odr.duty_week_start <= CURRENT_DATE
              AND odr.duty_week_end >= CURRENT_DATE
              AND odr.is_active = TRUE
            ORDER BY odr.shift_type
        ");

        DB::statement('DROP VIEW IF EXISTS active_inmate_activities');
        DB::statement("
            CREATE VIEW active_inmate_activities AS
            SELECT
                ia.id,
                i.id AS inmate_id,
                i.first_name,
                i.last_name,
                i.prison_number,
                a.id AS activity_id,
                a.name AS activity_name,
                a.activity_type,
                a.security_level,
                ia.assigned_date,
                u.name AS assigned_by_name
            FROM inmate_activities ia
            JOIN inmates i ON i.id = ia.inmate_id
            JOIN activities a ON a.id = ia.activity_id
            JOIN users u ON u.id = ia.assigned_by
            WHERE ia.end_date IS NULL
        ");

        DB::statement('DROP VIEW IF EXISTS session_attendance_summary');
        DB::statement("
            CREATE VIEW session_attendance_summary AS
            SELECT
                s.id AS session_id,
                a.name AS activity_name,
                s.session_date,
                s.session_time,
                u.name AS supervising_officer,
                COUNT(sa.id) AS total_recorded,
                COUNT(CASE WHEN sa.attendance_status = 'present' THEN 1 END) AS present_count,
                COUNT(CASE WHEN sa.attendance_status = 'absent' THEN 1 END) AS absent_count,
                COUNT(CASE WHEN sa.attendance_status = 'late' THEN 1 END) AS late_count
            FROM activity_sessions s
            JOIN activities a ON a.id = s.activity_id
            JOIN users u ON u.id = s.supervising_officer_id
            LEFT JOIN session_attendance sa ON sa.session_id = s.id
            GROUP BY s.id, a.name, s.session_date, s.session_time, u.name
        ");

        // =============================================
        // 11. Seed default activity categories (if empty)
        // =============================================
        if (DB::table('activity_categories')->count() === 0) {
            DB::table('activity_categories')->insert([
                [
                    'name' => 'Internal Predefined',
                    'description' => 'Standard internal activities like Kitchen, Tailoring',
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'name' => 'Internal Custom',
                    'description' => 'Custom internal activities created by admin',
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'name' => 'External',
                    'description' => 'External activities like community service',
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop views first
        DB::statement('DROP VIEW IF EXISTS session_attendance_summary');
        DB::statement('DROP VIEW IF EXISTS active_inmate_activities');
        DB::statement('DROP VIEW IF EXISTS current_duty_roster');

        // Drop tables in reverse order
        Schema::dropIfExists('activity_assignment_logs');
        Schema::dropIfExists('session_attendance');
        Schema::dropIfExists('activity_sessions');
        Schema::dropIfExists('officer_duty_rosters');
        Schema::dropIfExists('external_activity_details');

        // Remove added columns from activities table
        Schema::table('activities', function (Blueprint $table) {
            $table->dropForeign(['category_id']);
            $table->dropForeign(['created_by']);
            $table->dropForeign(['modified_by']);
            $table->dropColumn(['category_id', 'source_type', 'security_level', 'created_by', 'modified_by']);
        });

        // Drop activity_categories table
        Schema::dropIfExists('activity_categories');

        // Remove added columns from users table
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['is_eligible_for_duty', 'duty_preferences']);
        });

        // Remove index from inmate_activities
        Schema::table('inmate_activities', function (Blueprint $table) {
            $table->dropIndex('idx_inmate_activities_end_date');
        });
    }
};
