<?php

namespace Tests\Feature\ReleaseModule;

use App\Models\Role;
use App\Models\User;
use App\Modules\Admissions\Models\Admission;
use App\Modules\Admissions\Models\Inmate;
use App\Modules\Release\Models\ReleaseWorkflow;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReleaseModuleApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['ratelimit.enabled' => false]);
    }

    private function userWithRole(string $roleName): User
    {
        $role = Role::firstOrCreate(['name' => $roleName], ['description' => null]);

        return User::factory()->create(['role_id' => $role->id]);
    }

    private function createAdmission(array $overrides = []): Admission
    {
        $inmate = Inmate::query()->create([
            'prison_number' => 'P-' . fake()->unique()->numerify('####'),
            'first_name' => 'Release',
            'last_name' => 'Candidate',
            'date_of_birth' => '1990-01-01',
            'status' => 'active',
        ]);

        $projectedReleaseDate = $overrides['projected_release_date'] ?? CarbonImmutable::today()->addDays(14)->toDateString();
        $originalReleaseDate = $overrides['original_release_date'] ?? $projectedReleaseDate;
        $admittedBy = $overrides['admitted_by'] ?? $this->userWithRole('reception_officer')->id;

        return Admission::query()->create(array_merge([
            'inmate_id' => $inmate->id,
            'admission_date' => CarbonImmutable::today()->subMonths(10)->toDateString(),
            'admission_type' => 'first_time',
            'inmate_type' => 'convict',
            'case_number' => 'REL-' . fake()->unique()->numerify('####'),
            'sentence_years' => 1,
            'sentence_months' => 0,
            'sentence_start_date' => CarbonImmutable::today()->subMonths(10)->toDateString(),
            'projected_release_date' => $projectedReleaseDate,
            'original_release_date' => $originalReleaseDate,
            'admitted_by' => $admittedBy,
            'is_current' => true,
        ], $overrides));
    }

    private function completeClearanceChecklist(User $stationOfficer, Admission $admission): void
    {
        $start = $this->actingAs($stationOfficer, 'sanctum')->postJson('/api/releases/clearance-checklist', [
            'admission_id' => $admission->id,
        ]);

        $start->assertCreated();

        foreach ($start->json('data.items') as $item) {
            $this->actingAs($stationOfficer, 'sanctum')->postJson('/api/releases/clearance-checklist/clear-item', [
                'checklist_item_id' => $item['id'],
                'verification_notes' => 'Verified for release approval',
            ])->assertOk();
        }

        $this->actingAs($stationOfficer, 'sanctum')
            ->putJson('/api/releases/clearance-checklist/' . $start->json('data.checklist_id') . '/complete')
            ->assertOk()
            ->assertJsonPath('data.all_cleared', true);
    }

    public function test_station_officer_can_list_eligible_inmates_and_approve_release(): void
    {
        $stationOfficer = $this->userWithRole('station_officer');
        $eligibleAdmission = $this->createAdmission([
            'projected_release_date' => CarbonImmutable::today()->addDays(7)->toDateString(),
        ]);
        $this->createAdmission([
            'projected_release_date' => CarbonImmutable::today()->addDays(45)->toDateString(),
            'original_release_date' => CarbonImmutable::today()->addDays(45)->toDateString(),
        ]);

        $eligible = $this->actingAs($stationOfficer, 'sanctum')->getJson('/api/releases/eligible');
        $eligible->assertOk()->assertJsonFragment([
            'admission_id' => $eligibleAdmission->id,
        ]);

        $this->actingAs($stationOfficer, 'sanctum')->postJson('/api/releases/approve', [
            'admission_id' => $eligibleAdmission->id,
            'notes' => 'Should require clearance',
        ])->assertUnprocessable()
            ->assertJsonFragment([
                'error' => 'No clearance checklist found for this admission. Please initiate the clearance process first.',
            ]);

        $this->completeClearanceChecklist($stationOfficer, $eligibleAdmission);

        $response = $this->actingAs($stationOfficer, 'sanctum')->postJson('/api/releases/approve', [
            'admission_id' => $eligibleAdmission->id,
            'notes' => 'Sentence completed',
        ]);

        $response->assertCreated()
            ->assertJsonFragment([
                'admission_id' => $eligibleAdmission->id,
                'status' => 'approved',
            ]);

        $this->assertDatabaseHas('release_workflow', [
            'admission_id' => $eligibleAdmission->id,
            'status' => 'approved',
            'approved_by' => $stationOfficer->id,
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'table_name' => 'release_workflow',
            'record_id' => $response->json('id'),
            'user_id' => $stationOfficer->id,
        ]);
    }

    public function test_gatekeeper_can_confirm_release_and_finalize_inmate_status(): void
    {
        $stationOfficer = $this->userWithRole('station_officer');
        $gatekeeper = $this->userWithRole('gatekeeper');
        $admission = $this->createAdmission([
            'projected_release_date' => CarbonImmutable::today()->toDateString(),
            'original_release_date' => CarbonImmutable::today()->toDateString(),
        ]);

        $workflow = ReleaseWorkflow::query()->create([
            'admission_id' => $admission->id,
            'approved_by' => $stationOfficer->id,
            'approved_at' => now(),
            'status' => 'approved',
        ]);

        $response = $this->actingAs($gatekeeper, 'sanctum')->putJson("/api/releases/{$workflow->id}/confirm", [
            'notes' => 'Verified at gate',
        ]);

        $response->assertOk()
            ->assertJsonFragment([
                'id' => $workflow->id,
                'status' => 'confirmed',
                'confirmed_by' => $gatekeeper->id,
            ]);

        $admission->refresh();
        $admission->inmate->refresh();

        $this->assertSame('confirmed', $workflow->fresh()->status);
        $this->assertNotNull($admission->released_at);
        $this->assertSame('approved_release', $admission->release_reason);
        $this->assertSame('released', $admission->inmate->status);
        $this->assertNotNull($admission->inmate->last_release_date);
        $this->assertDatabaseHas('audit_logs', [
            'table_name' => 'release_workflow',
            'record_id' => $workflow->id,
            'user_id' => $gatekeeper->id,
            'action' => 'UPDATE',
        ]);
    }

    public function test_non_gatekeeper_cannot_confirm_release(): void
    {
        $stationOfficer = $this->userWithRole('station_officer');
        $admission = $this->createAdmission();

        $workflow = ReleaseWorkflow::query()->create([
            'admission_id' => $admission->id,
            'approved_by' => $stationOfficer->id,
            'approved_at' => now(),
            'status' => 'approved',
        ]);

        $this->actingAs($stationOfficer, 'sanctum')
            ->putJson("/api/releases/{$workflow->id}/confirm", [
                'notes' => 'Should fail',
            ])
            ->assertForbidden();
    }

    public function test_sentence_adjustment_recalculates_release_date_and_station_officer_can_delete_it(): void
    {
        $stationOfficer = $this->userWithRole('station_officer');
        $admission = $this->createAdmission([
            'projected_release_date' => '2026-05-30',
            'original_release_date' => '2026-05-30',
        ]);

        $store = $this->actingAs($stationOfficer, 'sanctum')->postJson('/api/adjustments', [
            'admission_id' => $admission->id,
            'adjustment_type' => 'remission',
            'adjustment_days' => 15,
            'effective_date' => '2026-04-20',
            'reason' => 'Good behavior',
        ]);

        $store->assertCreated()
            ->assertJsonFragment([
                'new_projected_release_date' => '2026-05-15',
                'total_adjustment_days' => 15,
            ]);

        $this->assertDatabaseHas('sentence_adjustments', [
            'admission_id' => $admission->id,
            'adjustment_days' => 15,
        ]);
        $this->assertSame('2026-05-15', $admission->fresh()->projected_release_date?->toDateString());
        $this->assertDatabaseHas('audit_logs', [
            'table_name' => 'sentence_adjustments',
            'record_id' => $store->json('adjustment.id'),
            'user_id' => $stationOfficer->id,
        ]);

        $this->actingAs($stationOfficer, 'sanctum')
            ->deleteJson('/api/adjustments/' . $store->json('adjustment.id'))
            ->assertNoContent();

        $this->assertDatabaseMissing('sentence_adjustments', [
            'id' => $store->json('adjustment.id'),
        ]);
        $this->assertSame('2026-05-30', $admission->fresh()->projected_release_date?->toDateString());
    }

    public function test_station_officer_can_apply_good_behaviour_adjustment(): void
    {
        $stationOfficer = $this->userWithRole('station_officer');
        $admission = $this->createAdmission([
            'projected_release_date' => '2026-05-30',
            'original_release_date' => '2026-05-30',
        ]);

        $response = $this->actingAs($stationOfficer, 'sanctum')->postJson("/api/admissions/{$admission->id}/adjustments", [
            'admission_id' => $admission->id,
            'adjustment_type' => 'good_behaviour',
            'adjustment_days' => 10,
            'effective_date' => '2026-04-20',
            'reason' => 'Sustained good behaviour record',
        ]);

        $response->assertCreated()
            ->assertJsonFragment([
                'new_projected_release_date' => '2026-05-20',
                'total_adjustment_days' => 10,
            ]);

        $this->assertDatabaseHas('sentence_adjustments', [
            'admission_id' => $admission->id,
            'adjustment_type' => 'good_behaviour',
            'adjustment_days' => 10,
        ]);
    }

    public function test_release_history_can_be_exported_as_pdf(): void
    {
        $stationOfficer = $this->userWithRole('station_officer');
        $admission = $this->createAdmission([
            'projected_release_date' => CarbonImmutable::today()->toDateString(),
            'original_release_date' => CarbonImmutable::today()->toDateString(),
        ]);

        ReleaseWorkflow::query()->create([
            'admission_id' => $admission->id,
            'approved_by' => $stationOfficer->id,
            'approved_at' => now(),
            'status' => 'approved',
        ]);

        $response = $this->actingAs($stationOfficer, 'sanctum')
            ->get('/api/releases/history/export?format=pdf');

        $response->assertOk();
        $response->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringStartsWith('%PDF', $response->baseResponse->getContent());
    }

    public function test_station_officer_can_lookup_release_dates_and_search_by_full_name_case_insensitive(): void
    {
        $stationOfficer = $this->userWithRole('station_officer');

        // Create a few inmates with specific names
        $inmate1 = Inmate::query()->create([
            'prison_number' => 'MIMS/2026/00001',
            'first_name' => 'John',
            'last_name' => 'Doe',
            'other_names' => 'Malawi',
            'date_of_birth' => '1990-01-01',
            'status' => 'active',
        ]);
        Admission::query()->create([
            'inmate_id' => $inmate1->id,
            'admission_date' => '2026-01-01',
            'admission_type' => 'first_time',
            'inmate_type' => 'convict',
            'case_number' => 'CASE-123',
            'sentence_years' => 1,
            'sentence_months' => 0,
            'sentence_start_date' => '2026-01-01',
            'projected_release_date' => '2027-01-01',
            'original_release_date' => '2027-01-01',
            'admitted_by' => $stationOfficer->id,
            'is_current' => true,
        ]);

        $inmate2 = Inmate::query()->create([
            'prison_number' => 'MIMS/2026/00002',
            'first_name' => 'Peter',
            'last_name' => 'Chirwa',
            'other_names' => 'Phiri',
            'date_of_birth' => '1992-05-05',
            'status' => 'active',
        ]);
        Admission::query()->create([
            'inmate_id' => $inmate2->id,
            'admission_date' => '2026-01-01',
            'admission_type' => 'first_time',
            'inmate_type' => 'remandee',
            'case_number' => 'CASE-456',
            'sentence_years' => 0,
            'sentence_months' => 0,
            'sentence_start_date' => '2026-01-01',
            'projected_release_date' => null,
            'original_release_date' => null,
            'admitted_by' => $stationOfficer->id,
            'is_current' => true,
        ]);

        // 1. Check basic listing
        $response = $this->actingAs($stationOfficer, 'sanctum')
            ->getJson('/api/releases/date-lookup');

        $response->assertOk()
            ->assertJsonCount(2, 'data');

        // 2. Search for "john doe" (full name, lowercase)
        $response = $this->actingAs($stationOfficer, 'sanctum')
            ->getJson('/api/releases/date-lookup?q=john+doe');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.prison_number', 'MIMS/2026/00001');

        // 3. Search for "chirwa peter" (swapped terms, lowercase)
        $response = $this->actingAs($stationOfficer, 'sanctum')
            ->getJson('/api/releases/date-lookup?q=chirwa+peter');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.prison_number', 'MIMS/2026/00002');

        // 4. Search for other_names "Malawi"
        $response = $this->actingAs($stationOfficer, 'sanctum')
            ->getJson('/api/releases/date-lookup?q=malawi');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.prison_number', 'MIMS/2026/00001');

        // 5. Search for case_number "CASE-456"
        $response = $this->actingAs($stationOfficer, 'sanctum')
            ->getJson('/api/releases/date-lookup?q=case-456');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.prison_number', 'MIMS/2026/00002');
    }
}
