<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('DROP FUNCTION IF EXISTS check_gatekeeper_role');

        DB::statement(<<<'SQL'
            CREATE OR REPLACE FUNCTION check_gatekeeper_role()
            RETURNS TRIGGER AS $$
            BEGIN
                IF NEW.confirmed_by IS NOT NULL THEN
                    PERFORM 1
                    FROM users
                    LEFT JOIN roles ON roles.id = users.role_id
                    WHERE users.id = NEW.confirmed_by
                      AND roles.name = 'gatekeeper';

                    IF NOT FOUND THEN
                        RAISE EXCEPTION 'Only a gatekeeper can confirm a release';
                    END IF;
                END IF;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        SQL);
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP FUNCTION IF EXISTS check_gatekeeper_role');
        }
    }
};
