<?php

namespace Database\Seeders;

use App\Modules\Admissions\Models\Admission;
use App\Modules\Admissions\Models\Cell;
use App\Modules\Admissions\Models\CellAllocation;
use App\Modules\Admissions\Models\Inmate;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class FemaleInmateSeeder extends Seeder
{
    /**
     * Seed female inmates along with their current admission and active cell allocation.
     */
    public function run(): void
    {
        // Ensure we have an admin/officer user to attribute admissions.
        // Prefer an existing reception/station officer if present.
        $admittedBy = $this->resolveAdmittedByUser();

        // Choose a reasonable default if no female cells exist yet.
        $femaleCellsQuery = Cell::query()->where('gender', 'female');
        if (! $femaleCellsQuery->exists()) {
            // Nothing to allocate against; still seed inmates so the UI has records.
            $inmates = $this->seedFemaleInmatesOnly();
            return;
        }

        $femaleCells = $femaleCellsQuery->orderBy('id')->get();

        DB::transaction(function () use ($femaleCells, $admittedBy) {
            $targetCount = 25;

            // Create inmates first. We'll then upsert admissions/allocations for them.
            $inmates = Inmate::factory()
                ->count($targetCount)
                ->state(['gender' => 'female', 'status' => 'active'])
                ->make();

            foreach ($inmates as $inmate) {
                // Upsert by prison_number to keep it idempotent-ish.
                $savedInmate = Inmate::updateOrCreate(
                    ['prison_number' => $inmate->prison_number],
                    $inmate->toArray()
                );

                // Create/ensure a current admission.
                // admission uniqueness isn't enforced by schema, so we use (inmate_id, is_current=true).
                $admission = Admission::firstOrCreate(
                    ['inmate_id' => $savedInmate->id, 'is_current' => true],
                    [
                        'admission_date' => now()->subMonths(2)->toDateString(),
                        'admission_type' => 'first_time',
                        'inmate_type' => 'convict',
                        'case_number' => strtoupper('CASE-' . uniqid()),
                        'court_name' => 'Magistrate Court',
                        'offence_description' => 'Seed offence (demo)',
                        'sentence_years' => 1,
                        'sentence_months' => 0,
                        'sentence_start_date' => now()->subMonths(2)->toDateString(),
                        'projected_release_date' => now()->addMonths(10)->toDateString(),
                        'original_release_date' => now()->addMonths(10)->toDateString(),
                        'remand_next_court_date' => null,
                        'committal_warrant_path' => null,
                        'remand_warrant_path' => null,
                        'admitted_by' => $admittedBy?->id,
                        'released_at' => null,
                        'release_reason' => null,
                    ]
                );

                // Allocate to a female cell (prefer an available one; fallback to any female cell).
                $cell = $femaleCells->first();

                // If cells have status/capacity management, prefer an available cell.
                if ($femaleCells->where('status', 'available')->count() > 0) {
                    $cell = $femaleCells->where('status', 'available')->first();
                }

                // If multiple allocations already exist, do a deterministic round-robin among all female cells.
                // Use modulo to avoid out-of-bounds issues (Collection is 0-indexed, but indexing can still be brittle).
                if ($femaleCells->count() > 0) {
                    $index = $savedInmate->id % $femaleCells->count();
                    $cell = $femaleCells->values()->get($index);
                }


                if (! $cell) {
                    // No cell to allocate to.
                    continue;
                }

                CellAllocation::updateOrCreate(
                    [
                        'inmate_id' => $savedInmate->id,
                        'admission_id' => $admission->id,
                    ],
                    [
                        'cell_id' => $cell->id,
                        'allocated_date' => now()->subMonths(1)->toDateString(),
                        'deallocated_date' => null,
                        'reason' => 'Seed allocation (female)',
                    ]
                );
            }
        });
    }

    private function resolveAdmittedByUser(): ?User
    {
        // Pick a role that likely exists in this project.
        $roleNames = ['reception_officer', 'station_officer', 'officer_on_duty', 'admin'];
        foreach ($roleNames as $roleName) {
            $role = Role::where('name', $roleName)->first();
            if (! $role) {
                continue;
            }

            $user = User::where('role_id', $role->id)->where('is_active', true)->first();
            if ($user) {
                return $user;
            }
        }

        return User::query()->where('is_active', true)->first();
    }

    private function seedFemaleInmatesOnly(): void
    {
        $inmates = Inmate::factory()
            ->count(25)
            ->state(['gender' => 'female', 'status' => 'active'])
            ->make();

        foreach ($inmates as $inmate) {
            Inmate::updateOrCreate(
                ['prison_number' => $inmate->prison_number],
                $inmate->toArray()
            );
        }
    }
}

