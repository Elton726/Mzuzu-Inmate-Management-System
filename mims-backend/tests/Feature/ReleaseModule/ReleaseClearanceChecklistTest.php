<?php

namespace Tests\Feature\ReleaseModule;

use App\Models\Role;
use App\Models\User;
use App\Modules\Admissions\Models\Admission;
use App\Modules\Admissions\Models\Inmate;
use App\Modules\Release\Models\ReleaseClearanceChecklist;
use App\Modules\Release\Models\ReleaseClearanceChecklistItem;
use App\Modules\Release\Models\ReleaseWorkflow;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReleaseClearanceChecklistTest extends TestCase
{
    use RefreshDatabase;

    private function userWithRole(string $roleName): User
    {
        $role = Role::firstOrCreate(['name' => $roleName], ['description' => null]);

        return User::factory()->create(['role_id' => $role->id]);
    }

    private function createAdmission(array $overrides = []): Admission
    {
        $inmate = Inmate::query()->create([
            'prison_number' => 'P-' . fake()->unique()->numerify('####'),
            'first_name' => 'Clearance',
            'last_name' => 'Test',
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
            'case_number' => 'CLR-' . fake()->unique()->numerify('####'),
            'sentence_years' => 1,
            'sentence_months' => 0,
            'sentence_start_date' => CarbonImmutable::today()->subMonths(10)->toDateString(),
            'projected_release_date' => $projectedReleaseDate,
            'original_release_date' => $originalReleaseDate,
            'admitted_by' => $admittedBy,
            'is_current' => true,
        ], $overrides));
    }

    private function createReleaseWorkflow(int $admissionId): ReleaseWorkflow
    {
        return ReleaseWorkflow::query()->create([
            'admission_id' => $admissionId,
            'approved_by' => $this->userWithRole('station_officer')->id,
            'approved_at' => now(),
            'status' => 'approved',
        ]);
    }

    /**
     * Test: Station officer can initiate a clearance checklist
     */
    public function test_station_officer_can_initiate_clearance_checklist(): void
    {
        $stationOfficer = $this->userWithRole('station_officer');
        $admission = $this->createAdmission();
        $workflow = $this->createReleaseWorkflow($admission->id);

        $response = $this->actingAs($stationOfficer, 'sanctum')->postJson('/api/releases/clearance-checklist', [
            'release_workflow_id' => $workflow->id,
            'admission_id' => $admission->id,
        ]);

        $response->assertCreated()
            ->assertJsonFragment([
                'workflow_id' => $workflow->id,
                'admission_id' => $admission->id,
                'total_items' => 7,
                'cleared_items' => 0,
                'completion_percentage' => 0,
            ])
            ->assertJsonPath('data.items', fn ($items) => count($items) === 7);

        $this->assertDatabaseHas('release_clearance_checklists', [
            'release_workflow_id' => $workflow->id,
            'admission_id' => $admission->id,
            'initiated_by' => $stationOfficer->id,
        ]);

        $this->assertDatabaseCount('release_clearance_checklist_items', 7);
    }

    /**
     * Test: Cannot initiate duplicate clearance checklist
     */
    public function test_cannot_initiate_duplicate_clearance_checklist(): void
    {
        $stationOfficer = $this->userWithRole('station_officer');
        $admission = $this->createAdmission();
        $workflow = $this->createReleaseWorkflow($admission->id);

        $this->actingAs($stationOfficer, 'sanctum')->postJson('/api/releases/clearance-checklist', [
            'release_workflow_id' => $workflow->id,
            'admission_id' => $admission->id,
        ]);

        $response = $this->actingAs($stationOfficer, 'sanctum')->postJson('/api/releases/clearance-checklist', [
            'release_workflow_id' => $workflow->id,
            'admission_id' => $admission->id,
        ]);

        $response->assertUnprocessable()
            ->assertJsonFragment(['error' => 'A clearance checklist already exists for this release workflow.']);
    }

    /**
     * Test: Station officer can clear individual checklist items
     */
    public function test_station_officer_can_clear_checklist_items(): void
    {
        $stationOfficer = $this->userWithRole('station_officer');
        $admission = $this->createAdmission();
        $workflow = $this->createReleaseWorkflow($admission->id);

        $initResponse = $this->actingAs($stationOfficer, 'sanctum')->postJson('/api/releases/clearance-checklist', [
            'release_workflow_id' => $workflow->id,
            'admission_id' => $admission->id,
        ]);

        $checklistId = $initResponse->json('data.checklist_id');
        $itemId = $initResponse->json('data.items.0.id');

        $response = $this->actingAs($stationOfficer, 'sanctum')->postJson('/api/releases/clearance-checklist/clear-item', [
            'checklist_item_id' => $itemId,
            'verification_notes' => 'Warrant verified and valid',
        ]);

        $response->assertOk()
            ->assertJsonFragment(['success' => true]);

        $this->assertDatabaseHas('release_clearance_checklist_items', [
            'id' => $itemId,
            'is_cleared' => true,
            'cleared_by' => $stationOfficer->id,
            'verification_notes' => 'Warrant verified and valid',
        ]);
    }

    /**
     * Test: Gatekeeper can clear items
     */
    public function test_gatekeeper_can_clear_checklist_items(): void
    {
        $stationOfficer = $this->userWithRole('station_officer');
        $gatekeeper = $this->userWithRole('gatekeeper');
        $admission = $this->createAdmission();
        $workflow = $this->createReleaseWorkflow($admission->id);

        $initResponse = $this->actingAs($stationOfficer, 'sanctum')->postJson('/api/releases/clearance-checklist', [
            'release_workflow_id' => $workflow->id,
            'admission_id' => $admission->id,
        ]);

        $itemId = $initResponse->json('data.items.0.id');

        $response = $this->actingAs($gatekeeper, 'sanctum')->postJson('/api/releases/clearance-checklist/clear-item', [
            'checklist_item_id' => $itemId,
            'verification_notes' => 'Verified by gatekeeper',
        ]);

        $response->assertOk()
            ->assertJsonFragment(['success' => true]);

        $this->assertDatabaseHas('release_clearance_checklist_items', [
            'id' => $itemId,
            'cleared_by' => $gatekeeper->id,
        ]);
    }

    /**
     * Test: Get clearance checklist status
     */
    public function test_can_get_clearance_checklist_status(): void
    {
        $stationOfficer = $this->userWithRole('station_officer');
        $admission = $this->createAdmission();
        $workflow = $this->createReleaseWorkflow($admission->id);

        $initResponse = $this->actingAs($stationOfficer, 'sanctum')->postJson('/api/releases/clearance-checklist', [
            'release_workflow_id' => $workflow->id,
            'admission_id' => $admission->id,
        ]);

        $checklistId = $initResponse->json('data.checklist_id');

        $response = $this->actingAs($stationOfficer, 'sanctum')->getJson("/api/releases/clearance-checklist/{$checklistId}/status");

        $response->assertOk()
            ->assertJsonFragment([
                'checklist_id' => $checklistId,
                'completion_percentage' => 0,
                'cleared_items' => 0,
                'pending_items' => 7,
            ]);
    }

    /**
     * Test: Complete checklist with all items cleared
     */
    public function test_can_complete_clearance_checklist(): void
    {
        $stationOfficer = $this->userWithRole('station_officer');
        $admission = $this->createAdmission();
        $workflow = $this->createReleaseWorkflow($admission->id);

        $initResponse = $this->actingAs($stationOfficer, 'sanctum')->postJson('/api/releases/clearance-checklist', [
            'release_workflow_id' => $workflow->id,
            'admission_id' => $admission->id,
        ]);

        $checklistId = $initResponse->json('data.checklist_id');
        $items = $initResponse->json('data.items');

        // Clear all 7 items
        foreach ($items as $item) {
            $this->actingAs($stationOfficer, 'sanctum')->postJson('/api/releases/clearance-checklist/clear-item', [
                'checklist_item_id' => $item['id'],
                'verification_notes' => "Cleared: {$item['label']}",
            ]);
        }

        $response = $this->actingAs($stationOfficer, 'sanctum')->putJson("/api/releases/clearance-checklist/{$checklistId}/complete");

        $response->assertOk()
            ->assertJsonFragment([
                'all_cleared' => true,
                'completion_percentage' => 100,
                'pending_items' => 0,
            ]);

        $this->assertDatabaseHas('release_clearance_checklists', [
            'id' => $checklistId,
            'all_items_cleared' => true,
            'completed_by' => $stationOfficer->id,
        ]);
    }

    /**
     * Test: Cannot complete checklist with uncleared items
     */
    public function test_cannot_complete_checklist_with_uncleared_items(): void
    {
        $stationOfficer = $this->userWithRole('station_officer');
        $admission = $this->createAdmission();
        $workflow = $this->createReleaseWorkflow($admission->id);

        $initResponse = $this->actingAs($stationOfficer, 'sanctum')->postJson('/api/releases/clearance-checklist', [
            'release_workflow_id' => $workflow->id,
            'admission_id' => $admission->id,
        ]);

        $checklistId = $initResponse->json('data.checklist_id');

        $response = $this->actingAs($stationOfficer, 'sanctum')->putJson("/api/releases/clearance-checklist/{$checklistId}/complete");

        $response->assertUnprocessable()
            ->assertJsonFragment(['error' => 'Cannot complete checklist with uncleared items.']);
    }

    /**
     * Test: Get checklist by workflow ID
     */
    public function test_can_get_checklist_by_workflow_id(): void
    {
        $stationOfficer = $this->userWithRole('station_officer');
        $admission = $this->createAdmission();
        $workflow = $this->createReleaseWorkflow($admission->id);

        $initResponse = $this->actingAs($stationOfficer, 'sanctum')->postJson('/api/releases/clearance-checklist', [
            'release_workflow_id' => $workflow->id,
            'admission_id' => $admission->id,
        ]);

        $response = $this->actingAs($stationOfficer, 'sanctum')->getJson("/api/releases/clearance-checklist/workflow/{$workflow->id}");

        $response->assertOk()
            ->assertJsonFragment([
                'workflow_id' => $workflow->id,
                'admission_id' => $admission->id,
            ]);
    }

    /**
     * Test: Get available clearance item types
     */
    public function test_can_get_available_item_types(): void
    {
        $stationOfficer = $this->userWithRole('station_officer');

        $response = $this->actingAs($stationOfficer, 'sanctum')->getJson('/api/releases/clearance-checklist/available-items');

        $response->assertOk();
        $items = $response->json('data');

        $this->assertCount(7, $items);
        $this->assertArrayHasKey('warrant_verified', $items);
        $this->assertArrayHasKey('no_pending_court_order', $items);
        $this->assertArrayHasKey('medical_clearance', $items);
    }

    /**
     * Test: Unauthorized user cannot initiate checklist
     */
    public function test_unauthorized_user_cannot_initiate_checklist(): void
    {
        $otherUser = $this->userWithRole('reception_officer');
        $admission = $this->createAdmission();
        $workflow = $this->createReleaseWorkflow($admission->id);

        $response = $this->actingAs($otherUser, 'sanctum')->postJson('/api/releases/clearance-checklist', [
            'release_workflow_id' => $workflow->id,
            'admission_id' => $admission->id,
        ]);

        $response->assertForbidden();
    }

    /**
     * Test: Cannot approve release without clearance
     */
    public function test_cannot_approve_release_without_clearance(): void
    {
        $stationOfficer = $this->userWithRole('station_officer');
        $admission = $this->createAdmission([
            'projected_release_date' => CarbonImmutable::today()->addDays(7)->toDateString(),
        ]);

        // Try to approve without initiating clearance
        $response = $this->actingAs($stationOfficer, 'sanctum')->postJson('/api/releases/approve', [
            'admission_id' => $admission->id,
            'notes' => 'Should fail - no clearance',
        ]);

        $response->assertUnprocessable()
            ->assertJsonFragment(['error' => 'No clearance checklist found for this admission']);
    }

    /**
     * Test: Cannot approve release with incomplete clearance
     */
    public function test_cannot_approve_release_with_incomplete_clearance(): void
    {
        $stationOfficer = $this->userWithRole('station_officer');
        $admission = $this->createAdmission([
            'projected_release_date' => CarbonImmutable::today()->addDays(7)->toDateString(),
        ]);

        // Initiate clearance but don't complete it
        $workflow = $this->createReleaseWorkflow($admission->id);
        $this->actingAs($stationOfficer, 'sanctum')->postJson('/api/releases/clearance-checklist', [
            'release_workflow_id' => $workflow->id,
            'admission_id' => $admission->id,
        ]);

        // Try to approve
        $response = $this->actingAs($stationOfficer, 'sanctum')->postJson('/api/releases/approve', [
            'admission_id' => $admission->id,
            'notes' => 'Should fail - incomplete clearance',
        ]);

        $response->assertUnprocessable()
            ->assertJsonFragment(['error' => 'Not all clearance items have been verified']);
    }

    /**
     * Test: Can approve release after clearance is complete
     */
    public function test_can_approve_release_after_clearance_complete(): void
    {
        $stationOfficer = $this->userWithRole('station_officer');
        $admission = $this->createAdmission([
            'projected_release_date' => CarbonImmutable::today()->addDays(7)->toDateString(),
        ]);

        // Initiate clearance
        $workflow = $this->createReleaseWorkflow($admission->id);
        $initResponse = $this->actingAs($stationOfficer, 'sanctum')->postJson('/api/releases/clearance-checklist', [
            'release_workflow_id' => $workflow->id,
            'admission_id' => $admission->id,
        ]);

        // Clear all items
        $items = $initResponse->json('data.items');
        foreach ($items as $item) {
            $this->actingAs($stationOfficer, 'sanctum')->postJson('/api/releases/clearance-checklist/clear-item', [
                'checklist_item_id' => $item['id'],
                'verification_notes' => "Cleared: {$item['label']}",
            ]);
        }

        // Complete checklist
        $checklistId = $initResponse->json('data.checklist_id');
        $this->actingAs($stationOfficer, 'sanctum')->putJson("/api/releases/clearance-checklist/{$checklistId}/complete");

        // Now try to approve - should succeed
        $response = $this->actingAs($stationOfficer, 'sanctum')->postJson('/api/releases/approve', [
            'admission_id' => $admission->id,
            'notes' => 'Release approved after complete clearance',
        ]);

        $response->assertCreated()
            ->assertJsonFragment(['status' => 'approved']);

        $this->assertDatabaseHas('release_workflow', [
            'admission_id' => $admission->id,
            'status' => 'approved',
        ]);
    }

    /**
     * Test: Can unclear a previously cleared item
     */
    public function test_station_officer_can_unclear_items(): void
    {
        $stationOfficer = $this->userWithRole('station_officer');
        $admission = $this->createAdmission();
        $workflow = $this->createReleaseWorkflow($admission->id);

        $initResponse = $this->actingAs($stationOfficer, 'sanctum')->postJson('/api/releases/clearance-checklist', [
            'release_workflow_id' => $workflow->id,
            'admission_id' => $admission->id,
        ]);

        $itemId = $initResponse->json('data.items.0.id');

        // Clear the item
        $this->actingAs($stationOfficer, 'sanctum')->postJson('/api/releases/clearance-checklist/clear-item', [
            'checklist_item_id' => $itemId,
            'verification_notes' => 'Initially cleared',
        ]);

        $this->assertDatabaseHas('release_clearance_checklist_items', [
            'id' => $itemId,
            'is_cleared' => true,
        ]);

        // Unclear the item
        $response = $this->actingAs($stationOfficer, 'sanctum')->postJson('/api/releases/clearance-checklist/unclear-item', [
            'checklist_item_id' => $itemId,
        ]);

        $response->assertOk()
            ->assertJsonFragment(['success' => true]);

        $this->assertDatabaseHas('release_clearance_checklist_items', [
            'id' => $itemId,
            'is_cleared' => false,
            'cleared_by' => null,
            'cleared_at' => null,
            'verification_notes' => null,
        ]);
    }

    /**
     * Test: Progress tracking updates correctly
     */
    public function test_progress_tracking_updates_correctly(): void
    {
        $stationOfficer = $this->userWithRole('station_officer');
        $admission = $this->createAdmission();
        $workflow = $this->createReleaseWorkflow($admission->id);

        $initResponse = $this->actingAs($stationOfficer, 'sanctum')->postJson('/api/releases/clearance-checklist', [
            'release_workflow_id' => $workflow->id,
            'admission_id' => $admission->id,
        ]);

        $checklistId = $initResponse->json('data.checklist_id');
        $items = $initResponse->json('data.items');

        // Check initial state: 0%
        $status = $this->actingAs($stationOfficer, 'sanctum')->getJson("/api/releases/clearance-checklist/{$checklistId}/status");
        $this->assertEquals(0, $status->json('data.completion_percentage'));
        $this->assertEquals(0, $status->json('data.cleared_items'));

        // Clear 3 items: 42%
        for ($i = 0; $i < 3; $i++) {
            $this->actingAs($stationOfficer, 'sanctum')->postJson('/api/releases/clearance-checklist/clear-item', [
                'checklist_item_id' => $items[$i]['id'],
            ]);
        }

        $status = $this->actingAs($stationOfficer, 'sanctum')->getJson("/api/releases/clearance-checklist/{$checklistId}/status");
        $this->assertEquals(3, $status->json('data.cleared_items'));
        $this->assertEquals(4, $status->json('data.pending_items'));
        $this->assertTrue($status->json('data.completion_percentage') > 0);
        $this->assertTrue($status->json('data.completion_percentage') < 100);

        // Clear remaining 4 items: 100%
        for ($i = 3; $i < 7; $i++) {
            $this->actingAs($stationOfficer, 'sanctum')->postJson('/api/releases/clearance-checklist/clear-item', [
                'checklist_item_id' => $items[$i]['id'],
            ]);
        }

        $status = $this->actingAs($stationOfficer, 'sanctum')->getJson("/api/releases/clearance-checklist/{$checklistId}/status");
        $this->assertEquals(100, $status->json('data.completion_percentage'));
        $this->assertEquals(7, $status->json('data.cleared_items'));
        $this->assertEquals(0, $status->json('data.pending_items'));
    }
}
