<?php

namespace Tests\Feature\ActivityAllocation\Officer;

use App\Models\Role;
use App\Models\User;
use App\Modules\Admissions\Models\Activity;
use App\Modules\Admissions\Models\Admission;
use App\Modules\Admissions\Models\Inmate;
use App\Modules\Admissions\Models\InmateActivity;
use App\Modules\ActivityAllocation\Models\ActivityAssignmentLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class OfficerExternalActivityAllocationTest extends TestCase
{
    use RefreshDatabase;

    private function createOfficer(): User
    {
        $role = Role::firstOrCreate(['name' => 'officer_on_duty'], ['description' => null]);
        return User::factory()->create(['role_id' => $role->id]);
    }

    private function createExternalActivity(array $overrides = []): Activity
    {
        return Activity::query()->create(array_merge([
            'name' => 'External ' . uniqid(),
            'activity_type' => 'external',
            'is_active' => true,
            'eligibility_criteria' => ['allowed_inmate_types' => ['convict']],
            'max_participants' => 10,
        ], $overrides));
    }

    private function createCurrentAdmission(string $inmateType = 'convict'): Admission
    {
        $inmate = Inmate::query()->create([
            'prison_number' => 'PN-' . uniqid(),
            'first_name' => 'Name',
            'last_name' => 'Surname',
            'date_of_birth' => '2000-01-01',
        ]);

        return Admission::query()->create([
            'inmate_id' => $inmate->id,
            'admission_date' => '2026-04-03',
            'admission_type' => 'first_time',
            'inmate_type' => $inmateType,
            'case_number' => 'CASE-' . uniqid(),
            'sentence_years' => $inmateType === 'convict' ? 2 : null,
            'admitted_by' => $this->createOfficer()->id,
            'is_current' => true,
        ]);
    }

    public function test_officer_can_list_eligible_inmates_for_external_activity(): void
    {
        $officer = $this->createOfficer();
        $activity = $this->createExternalActivity();
        $eligible = $this->createCurrentAdmission('convict');
        $ineligibleType = $this->createCurrentAdmission('remandee');
        $alreadyAssigned = $this->createCurrentAdmission('convict');

        InmateActivity::query()->create([
            'inmate_id' => $alreadyAssigned->inmate_id,
            'admission_id' => $alreadyAssigned->id,
            'activity_id' => $activity->id,
            'assigned_date' => '2026-04-03',
            'assigned_by' => $officer->id,
        ]);

        $response = $this->actingAs($officer, 'sanctum')
            ->getJson("/api/officer/activities/{$activity->id}/eligible-inmates");

        $response->assertStatus(200)
            ->assertJsonFragment([
                'inmate_id' => $eligible->inmate_id,
                'admission_id' => $eligible->id,
            ]);

        $eligibleIds = collect($response->json('eligible_inmates'))->pluck('inmate_id')->all();
        $this->assertContains($eligible->inmate_id, $eligibleIds);
        $this->assertNotContains($ineligibleType->inmate_id, $eligibleIds);
        $this->assertNotContains($alreadyAssigned->inmate_id, $eligibleIds);
    }

    public function test_officer_can_manually_allocate_inmates_to_external_activity(): void
    {
        $officer = $this->createOfficer();
        $activity = $this->createExternalActivity();
        $admission = $this->createCurrentAdmission('convict');

        $response = $this->actingAs($officer, 'sanctum')
            ->postJson("/api/officer/activities/{$activity->id}/allocations/manual", [
                'inmate_ids' => [$admission->inmate_id],
                'notes' => 'Selected by officer',
            ]);

        $response->assertStatus(201)
            ->assertJsonFragment([
                'activity_id' => $activity->id,
                'allocated_count' => 1,
            ]);

        $this->assertDatabaseHas('inmate_activities', [
            'inmate_id' => $admission->inmate_id,
            'admission_id' => $admission->id,
            'activity_id' => $activity->id,
            'assigned_by' => $officer->id,
        ]);

        $assignment = InmateActivity::query()->where('inmate_id', $admission->inmate_id)->where('activity_id', $activity->id)->firstOrFail();
        $this->assertDatabaseHas('activity_assignment_logs', [
            'inmate_activity_id' => $assignment->id,
            'assigned_by' => $officer->id,
            'assignment_reason' => 'manual external allocation',
        ]);
    }

    public function test_officer_can_auto_allocate_eligible_inmates_with_slot_limit(): void
    {
        $officer = $this->createOfficer();
        $activity = $this->createExternalActivity(['max_participants' => 1]);
        $first = $this->createCurrentAdmission('convict');
        $second = $this->createCurrentAdmission('convict');

        $response = $this->actingAs($officer, 'sanctum')
            ->postJson("/api/officer/activities/{$activity->id}/allocations/auto");

        $response->assertStatus(201)
            ->assertJsonFragment([
                'activity_id' => $activity->id,
                'allocated_count' => 1,
            ]);

        $this->assertSame(
            1,
            InmateActivity::query()->where('activity_id', $activity->id)->whereNull('end_date')->count()
        );

        $allocatedInmateIds = InmateActivity::query()->where('activity_id', $activity->id)->pluck('inmate_id')->all();
        $this->assertTrue(
            in_array($first->inmate_id, $allocatedInmateIds, true) || in_array($second->inmate_id, $allocatedInmateIds, true)
        );
    }

    public function test_external_allocation_closes_existing_active_assignment_before_reassigning(): void
    {
        $officer = $this->createOfficer();
        $internalActivity = Activity::query()->create([
            'name' => 'Internal ' . uniqid(),
            'activity_type' => 'internal',
            'is_active' => true,
        ]);
        $externalActivity = $this->createExternalActivity();
        $admission = $this->createCurrentAdmission('convict');

        $previousAssignment = InmateActivity::query()->create([
            'inmate_id' => $admission->inmate_id,
            'admission_id' => $admission->id,
            'activity_id' => $internalActivity->id,
            'assigned_date' => '2026-04-03',
            'assigned_by' => $officer->id,
            'notes' => 'Initial assignment',
        ]);

        $response = $this->actingAs($officer, 'sanctum')
            ->postJson("/api/officer/activities/{$externalActivity->id}/allocations/manual", [
                'inmate_ids' => [$admission->inmate_id],
            ]);

        $response->assertStatus(201)->assertJsonFragment([
            'activity_id' => $externalActivity->id,
            'allocated_count' => 1,
        ]);

        $previousAssignment->refresh();
        $this->assertNotNull($previousAssignment->end_date);

        $this->assertDatabaseHas('inmate_activities', [
            'inmate_id' => $admission->inmate_id,
            'admission_id' => $admission->id,
            'activity_id' => $externalActivity->id,
            'assigned_by' => $officer->id,
            'end_date' => null,
        ]);
    }

    public function test_external_allocation_reuses_existing_row_when_absolute_unique_constraint_exists(): void
    {
        $officer = $this->createOfficer();
        $internalActivity = Activity::query()->create([
            'name' => 'Internal ' . uniqid(),
            'activity_type' => 'internal',
            'is_active' => true,
        ]);
        $externalActivity = $this->createExternalActivity();
        $admission = $this->createCurrentAdmission('convict');

        $existingAssignment = InmateActivity::query()->create([
            'inmate_id' => $admission->inmate_id,
            'admission_id' => $admission->id,
            'activity_id' => $internalActivity->id,
            'assigned_date' => '2026-04-03',
            'assigned_by' => $officer->id,
            'notes' => 'Existing assignment',
        ]);

        DB::statement('DROP INDEX IF EXISTS inmate_activities_unique_active');
        DB::statement('CREATE UNIQUE INDEX unique_active_activity ON inmate_activities(inmate_id, admission_id)');

        $response = $this->actingAs($officer, 'sanctum')
            ->postJson("/api/officer/activities/{$externalActivity->id}/allocations/manual", [
                'inmate_ids' => [$admission->inmate_id],
            ]);

        $response->assertStatus(201)->assertJsonFragment([
            'activity_id' => $externalActivity->id,
            'allocated_count' => 1,
        ]);

        $this->assertSame(
            1,
            InmateActivity::query()
                ->where('inmate_id', $admission->inmate_id)
                ->where('admission_id', $admission->id)
                ->count()
        );

        $existingAssignment->refresh();
        $this->assertSame($externalActivity->id, (int) $existingAssignment->activity_id);
        $this->assertNull($existingAssignment->end_date);
    }
}
