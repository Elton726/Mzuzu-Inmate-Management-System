<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('admissions', function (Blueprint $table) {
            if (!Schema::hasColumn('admissions', 'original_release_date')) {
                $table->date('original_release_date')->nullable()->after('projected_release_date');
            }
        });

        Schema::table('inmates', function (Blueprint $table) {
            if (!Schema::hasColumn('inmates', 'last_release_date')) {
                $table->date('last_release_date')->nullable()->after('status');
            }
        });

        if (!Schema::hasTable('sentence_adjustments')) {
            Schema::create('sentence_adjustments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('admission_id')->constrained()->onDelete('cascade');
                $table->string('adjustment_type', 50);
                $table->integer('adjustment_days');
                $table->date('effective_date');
                $table->text('reason')->nullable();
                $table->foreignId('approved_by')->constrained('users')->onDelete('restrict');
                $table->timestamps(0);
                $table->index('admission_id');
                $table->index('effective_date');
            });
        }

        if (!Schema::hasTable('release_workflow')) {
            Schema::create('release_workflow', function (Blueprint $table) {
                $table->id();
                $table->foreignId('admission_id')->constrained()->onDelete('cascade');
                $table->foreignId('approved_by')->constrained('users')->onDelete('restrict');
                $table->timestamp('approved_at')->default(DB::raw('CURRENT_TIMESTAMP'));
                $table->text('approval_notes')->nullable();
                $table->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('confirmed_at')->nullable();
                $table->text('confirmation_notes')->nullable();
                $table->foreignId('cancelled_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('cancelled_at')->nullable();
                $table->text('cancellation_reason')->nullable();
                $table->string('status', 20)->default('approved');
                $table->timestamps(0);
                $table->index('admission_id');
                $table->index('status');
            });
        }

        $this->createReleaseAutomation();
        $this->createViews();
    }

    public function down(): void
    {
        DB::statement('DROP VIEW IF EXISTS sentence_adjustment_summary');
        DB::statement('DROP VIEW IF EXISTS release_history');
        DB::statement('DROP VIEW IF EXISTS pending_gatekeeper_releases');
        DB::statement('DROP VIEW IF EXISTS inmates_due_for_release');

        $this->dropReleaseAutomation();

        Schema::dropIfExists('release_workflow');
        Schema::dropIfExists('sentence_adjustments');

        Schema::table('admissions', function (Blueprint $table) {
            if (Schema::hasColumn('admissions', 'original_release_date')) {
                $table->dropColumn('original_release_date');
            }
        });

        Schema::table('inmates', function (Blueprint $table) {
            if (Schema::hasColumn('inmates', 'last_release_date')) {
                $table->dropColumn('last_release_date');
            }
        });
    }

    private function createReleaseAutomation(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            $this->createPostgresAutomation();

            return;
        }

        $this->createSqliteAutomation();
    }

    private function dropReleaseAutomation(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP TRIGGER IF EXISTS trigger_check_gatekeeper ON release_workflow');
            DB::statement('DROP TRIGGER IF EXISTS trigger_prevent_double_confirmation ON release_workflow');
            DB::statement('DROP TRIGGER IF EXISTS trigger_finalize_release ON release_workflow');
            DB::statement('DROP TRIGGER IF EXISTS trigger_recalc_release_date ON sentence_adjustments');
            DB::statement('DROP FUNCTION IF EXISTS check_gatekeeper_role');
            DB::statement('DROP FUNCTION IF EXISTS prevent_double_confirmation');
            DB::statement('DROP FUNCTION IF EXISTS finalize_release');
            DB::statement('DROP FUNCTION IF EXISTS recalc_projected_release_date');

            return;
        }

        DB::statement('DROP TRIGGER IF EXISTS trigger_recalc_release_date_insert');
        DB::statement('DROP TRIGGER IF EXISTS trigger_recalc_release_date_update');
        DB::statement('DROP TRIGGER IF EXISTS trigger_recalc_release_date_delete');
        DB::statement('DROP TRIGGER IF EXISTS trigger_finalize_release');
        DB::statement('DROP TRIGGER IF EXISTS trigger_prevent_double_confirmation');
        DB::statement('DROP TRIGGER IF EXISTS trigger_check_gatekeeper');
    }

    private function createPostgresAutomation(): void
    {
        DB::statement("
            CREATE OR REPLACE FUNCTION recalc_projected_release_date()
            RETURNS TRIGGER AS $$
            DECLARE
                target_admission_id BIGINT;
                total_adjustment_days INTEGER;
                base_release DATE;
            BEGIN
                target_admission_id := COALESCE(NEW.admission_id, OLD.admission_id);

                SELECT COALESCE(original_release_date, projected_release_date) INTO base_release
                FROM admissions
                WHERE id = target_admission_id;

                SELECT COALESCE(SUM(adjustment_days), 0) INTO total_adjustment_days
                FROM sentence_adjustments
                WHERE admission_id = target_admission_id;

                UPDATE admissions
                SET projected_release_date = CASE
                    WHEN base_release IS NULL THEN NULL
                    ELSE base_release - (total_adjustment_days || ' days')::INTERVAL
                END
                WHERE id = target_admission_id;

                RETURN COALESCE(NEW, OLD);
            END;
            $$ LANGUAGE plpgsql;
        ");
        DB::statement("
            CREATE TRIGGER trigger_recalc_release_date
            AFTER INSERT OR UPDATE OR DELETE ON sentence_adjustments
            FOR EACH ROW
            EXECUTE FUNCTION recalc_projected_release_date();
        ");

        DB::statement("
            CREATE OR REPLACE FUNCTION finalize_release()
            RETURNS TRIGGER AS $$
            BEGIN
                IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
                    UPDATE inmates
                    SET status = 'released',
                        last_release_date = CURRENT_DATE
                    WHERE id = (SELECT inmate_id FROM admissions WHERE id = NEW.admission_id);

                    UPDATE admissions
                    SET released_at = CURRENT_DATE,
                        release_reason = 'approved_release'
                    WHERE id = NEW.admission_id;
                END IF;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        ");
        DB::statement("
            CREATE TRIGGER trigger_finalize_release
            AFTER UPDATE ON release_workflow
            FOR EACH ROW
            WHEN (NEW.status = 'confirmed' AND OLD.status != 'confirmed')
            EXECUTE FUNCTION finalize_release();
        ");

        DB::statement("
            CREATE OR REPLACE FUNCTION prevent_double_confirmation()
            RETURNS TRIGGER AS $$
            BEGIN
                IF OLD.status = 'confirmed' AND NEW.status = 'confirmed' THEN
                    RAISE EXCEPTION 'Release already confirmed for this admission';
                END IF;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        ");
        DB::statement("
            CREATE TRIGGER trigger_prevent_double_confirmation
            BEFORE UPDATE ON release_workflow
            FOR EACH ROW
            WHEN (OLD.status = 'confirmed' AND NEW.status = 'confirmed')
            EXECUTE FUNCTION prevent_double_confirmation();
        ");

        DB::statement("
            CREATE OR REPLACE FUNCTION check_gatekeeper_role()
            RETURNS TRIGGER AS $$
            BEGIN
                IF NEW.confirmed_by IS NOT NULL THEN
                    PERFORM 1
                    FROM users
                    LEFT JOIN roles ON roles.id = users.role_id
                    WHERE users.id = NEW.confirmed_by
                      AND roles.name IN ('gatekeeper', 'admin');

                    IF NOT FOUND THEN
                        RAISE EXCEPTION 'Only a gatekeeper or admin can confirm a release';
                    END IF;
                END IF;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        ");
        DB::statement("
            CREATE TRIGGER trigger_check_gatekeeper
            BEFORE UPDATE ON release_workflow
            FOR EACH ROW
            WHEN (NEW.confirmed_by IS DISTINCT FROM OLD.confirmed_by)
            EXECUTE FUNCTION check_gatekeeper_role();
        ");
    }

    private function createSqliteAutomation(): void
    {
        DB::statement("
            CREATE TRIGGER trigger_recalc_release_date_insert
            AFTER INSERT ON sentence_adjustments
            FOR EACH ROW
            BEGIN
                UPDATE admissions
                SET projected_release_date = CASE
                    WHEN COALESCE(original_release_date, projected_release_date) IS NULL THEN NULL
                    ELSE date(
                        COALESCE(original_release_date, projected_release_date),
                        '-' || COALESCE((SELECT SUM(adjustment_days) FROM sentence_adjustments WHERE admission_id = NEW.admission_id), 0) || ' days'
                    )
                END
                WHERE id = NEW.admission_id;
            END
        ");

        DB::statement("
            CREATE TRIGGER trigger_recalc_release_date_update
            AFTER UPDATE ON sentence_adjustments
            FOR EACH ROW
            BEGIN
                UPDATE admissions
                SET projected_release_date = CASE
                    WHEN COALESCE(original_release_date, projected_release_date) IS NULL THEN NULL
                    ELSE date(
                        COALESCE(original_release_date, projected_release_date),
                        '-' || COALESCE((SELECT SUM(adjustment_days) FROM sentence_adjustments WHERE admission_id = NEW.admission_id), 0) || ' days'
                    )
                END
                WHERE id = NEW.admission_id;
            END
        ");

        DB::statement("
            CREATE TRIGGER trigger_recalc_release_date_delete
            AFTER DELETE ON sentence_adjustments
            FOR EACH ROW
            BEGIN
                UPDATE admissions
                SET projected_release_date = CASE
                    WHEN COALESCE(original_release_date, projected_release_date) IS NULL THEN NULL
                    ELSE date(
                        COALESCE(original_release_date, projected_release_date),
                        '-' || COALESCE((SELECT SUM(adjustment_days) FROM sentence_adjustments WHERE admission_id = OLD.admission_id), 0) || ' days'
                    )
                END
                WHERE id = OLD.admission_id;
            END
        ");

        DB::statement("
            CREATE TRIGGER trigger_prevent_double_confirmation
            BEFORE UPDATE ON release_workflow
            FOR EACH ROW
            WHEN OLD.status = 'confirmed' AND NEW.status = 'confirmed'
            BEGIN
                SELECT RAISE(ABORT, 'Release already confirmed for this admission');
            END
        ");

        DB::statement("
            CREATE TRIGGER trigger_check_gatekeeper
            BEFORE UPDATE ON release_workflow
            FOR EACH ROW
            WHEN NEW.confirmed_by IS NOT OLD.confirmed_by AND NEW.confirmed_by IS NOT NULL
            BEGIN
                SELECT CASE
                    WHEN NOT EXISTS (
                        SELECT 1
                        FROM users
                        LEFT JOIN roles ON roles.id = users.role_id
                        WHERE users.id = NEW.confirmed_by
                          AND roles.name IN ('gatekeeper', 'admin')
                    ) THEN RAISE(ABORT, 'Only a gatekeeper or admin can confirm a release')
                END;
            END
        ");

        DB::statement("
            CREATE TRIGGER trigger_finalize_release
            AFTER UPDATE ON release_workflow
            FOR EACH ROW
            WHEN NEW.status = 'confirmed' AND OLD.status != 'confirmed'
            BEGIN
                UPDATE inmates
                SET status = 'released',
                    last_release_date = date('now')
                WHERE id = (SELECT inmate_id FROM admissions WHERE id = NEW.admission_id);

                UPDATE admissions
                SET released_at = date('now'),
                    release_reason = 'approved_release'
                WHERE id = NEW.admission_id;
            END
        ");
    }

    private function createViews(): void
    {
        DB::statement('DROP VIEW IF EXISTS inmates_due_for_release');
        DB::statement('DROP VIEW IF EXISTS pending_gatekeeper_releases');
        DB::statement('DROP VIEW IF EXISTS release_history');
        DB::statement('DROP VIEW IF EXISTS sentence_adjustment_summary');

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("
                CREATE VIEW inmates_due_for_release AS
                SELECT
                    i.id AS inmate_id,
                    i.first_name,
                    i.last_name,
                    i.prison_number,
                    a.id AS admission_id,
                    a.projected_release_date,
                    a.released_at,
                    a.is_current
                FROM inmates i
                JOIN admissions a ON a.inmate_id = i.id AND a.is_current = true
                WHERE a.projected_release_date IS NOT NULL
                  AND a.released_at IS NULL
                  AND a.projected_release_date <= CURRENT_DATE + INTERVAL '30 days'
                  AND NOT EXISTS (
                      SELECT 1 FROM release_workflow rw
                      WHERE rw.admission_id = a.id AND rw.status IN ('approved', 'confirmed')
                  )
                ORDER BY a.projected_release_date
            ");
        } else {
            DB::statement("
                CREATE VIEW inmates_due_for_release AS
                SELECT
                    i.id AS inmate_id,
                    i.first_name,
                    i.last_name,
                    i.prison_number,
                    a.id AS admission_id,
                    a.projected_release_date,
                    a.released_at,
                    a.is_current
                FROM inmates i
                JOIN admissions a ON a.inmate_id = i.id AND a.is_current = 1
                WHERE a.projected_release_date IS NOT NULL
                  AND a.released_at IS NULL
                  AND date(a.projected_release_date) <= date('now', '+30 day')
                  AND NOT EXISTS (
                      SELECT 1 FROM release_workflow rw
                      WHERE rw.admission_id = a.id AND rw.status IN ('approved', 'confirmed')
                  )
                ORDER BY a.projected_release_date
            ");
        }

        DB::statement("
            CREATE VIEW pending_gatekeeper_releases AS
            SELECT
                rw.id AS workflow_id,
                rw.admission_id,
                i.id AS inmate_id,
                i.first_name,
                i.last_name,
                i.prison_number,
                a.projected_release_date,
                rw.approved_by,
                u_approver.name AS approved_by_name,
                rw.approved_at
            FROM release_workflow rw
            JOIN admissions a ON a.id = rw.admission_id
            JOIN inmates i ON i.id = a.inmate_id
            JOIN users u_approver ON u_approver.id = rw.approved_by
            WHERE rw.status = 'approved'
            ORDER BY rw.approved_at
        ");

        DB::statement("
            CREATE VIEW release_history AS
            SELECT
                rw.id AS workflow_id,
                rw.admission_id,
                i.id AS inmate_id,
                i.first_name,
                i.last_name,
                i.prison_number,
                a.projected_release_date,
                rw.status,
                rw.approved_by,
                u_approver.name AS approved_by_name,
                rw.approved_at,
                rw.confirmed_by,
                u_confirmer.name AS confirmed_by_name,
                rw.confirmed_at,
                rw.cancelled_by,
                rw.cancelled_at
            FROM release_workflow rw
            JOIN admissions a ON a.id = rw.admission_id
            JOIN inmates i ON i.id = a.inmate_id
            LEFT JOIN users u_approver ON u_approver.id = rw.approved_by
            LEFT JOIN users u_confirmer ON u_confirmer.id = rw.confirmed_by
            ORDER BY rw.created_at DESC
        ");

        DB::statement("
            CREATE VIEW sentence_adjustment_summary AS
            SELECT
                a.id AS admission_id,
                i.id AS inmate_id,
                i.first_name,
                i.last_name,
                COALESCE(SUM(sa.adjustment_days), 0) AS total_remission_days,
                COUNT(sa.id) AS adjustment_count,
                a.projected_release_date,
                a.original_release_date
            FROM admissions a
            JOIN inmates i ON i.id = a.inmate_id
            LEFT JOIN sentence_adjustments sa ON sa.admission_id = a.id
            GROUP BY a.id, i.id, i.first_name, i.last_name, a.projected_release_date, a.original_release_date
        ");
    }
};
