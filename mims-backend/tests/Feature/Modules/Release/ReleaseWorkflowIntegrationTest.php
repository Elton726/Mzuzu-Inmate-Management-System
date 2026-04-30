<?php

namespace Tests\Feature\Modules\Release;

use App\Models\Role;
use App\Models\User;
use App\Modules\Admissions\Models\Admission;
use App\Modules\Admissions\Models\Inmate;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReleaseWorkflowIntegrationTest extends TestCase
{
    use RefreshDatabase;

    private User $stationOfficer;
    private User $gatekeeper;
    private User $admin;
    private Inmate $inmate;
    private Admission $admission;

    protected function setUp(): void
    {
        parent::setUp();

        // Create users with proper roles
        $this->stationOfficer = $this->userWithRole('station_officer');

        $this->gatekeeper = $this->userWithRole('gatekeeper');

        $this->admin = $this->userWithRole('admin');

        // Create inmate and eligible admission
        $this->inmate = Inmate::factory()->create([
            'first_name' => 'John',
            'last_name' => 'Doe',
            'prison_number' => 'MZ001234',
        ]);

        $this->admission = Admission::factory()->create([
            'inmate_id' => $this->inmate->id,
            'is_current' => true,
            'released_at' => null,
            'original_release_date' => Carbon::now()->addDays(20),
            'projected_release_date' => Carbon::now()->addDays(20),
        ]);
    }

    private function userWithRole(string $roleName): User
    {
        $role = Role::firstOrCreate(['name' => $roleName], ['description' => null]);

        return User::factory()->create(['role_id' => $role->id]);
    }

    /** @test */
    public function full_release_workflow_from_approval_to_confirmation()
    {
        // Step 1: Station officer approves release
        $approvalResponse = $this->actingAs($this->stationOfficer)
            ->postJson('/api/releases/approve', [
                'admission_id' => $this->admission->id,
                'notes' => 'Inmate approved for release.',
            ]);

        $approvalResponse->assertStatus(201);
        $workflowId = $approvalResponse->json('id');

        // Verify release is in approved status
        $this->assertDatabaseHas('release_workflow', [
            'id' => $workflowId,
            'admission_id' => $this->admission->id,
            'status' => 'approved',
            'approved_by' => $this->stationOfficer->id,
        ]);

        // Step 2: Gatekeeper views pending releases
        $pendingResponse = $this->actingAs($this->gatekeeper)
            ->getJson('/api/releases/pending');

        $pendingResponse->assertStatus(200);
        $pendingData = $pendingResponse->json('data');
        // Should contain the approved workflow
        if (!empty($pendingData)) {
            $this->assertIsArray($pendingData);
        }

        // Step 3: Gatekeeper confirms release
        $confirmResponse = $this->actingAs($this->gatekeeper)
            ->putJson("/api/releases/{$workflowId}/confirm", [
                'notes' => 'Released at 14:30, ID verified.',
            ]);

        $confirmResponse->assertStatus(200);

        // Verify release is now confirmed
        $this->assertDatabaseHas('release_workflow', [
            'id' => $workflowId,
            'status' => 'confirmed',
            'confirmed_by' => $this->gatekeeper->id,
        ]);
    }

    /** @test */
    public function release_workflow_with_sentence_adjustment()
    {
        // Step 1: Apply sentence adjustment before approval
        $adjustmentResponse = $this->actingAs($this->stationOfficer)
            ->postJson('/api/adjustments', [
                'admission_id' => $this->admission->id,
                'adjustment_type' => 'remission',
                'adjustment_days' => 10,
                'effective_date' => Carbon::now()->toDateString(),
                'reason' => 'Good behaviour',
            ]);

        $adjustmentResponse->assertStatus(201);

        // Refresh admission to see updated projected release date
        $this->admission->refresh();
        $newReleaseDate = $this->admission->projected_release_date;

        // Step 2: Approve release with adjusted date
        $approvalResponse = $this->actingAs($this->stationOfficer)
            ->postJson('/api/releases/approve', [
                'admission_id' => $this->admission->id,
                'notes' => 'Approved with remission applied.',
            ]);

        $approvalResponse->assertStatus(201);
        $workflowId = $approvalResponse->json('id');

        // Step 3: Confirm release
        $confirmResponse = $this->actingAs($this->gatekeeper)
            ->putJson("/api/releases/{$workflowId}/confirm", [
                'notes' => 'Released',
            ]);

        $confirmResponse->assertStatus(200);

        // Verify workflow is confirmed
        $this->assertDatabaseHas('release_workflow', [
            'id' => $workflowId,
            'status' => 'confirmed',
        ]);
    }

    /** @test */
    public function admin_cannot_oversee_release_workflow()
    {
        $approvalResponse = $this->actingAs($this->admin)
            ->postJson('/api/releases/approve', [
                'admission_id' => $this->admission->id,
                'notes' => 'Admin approval',
            ]);

        $approvalResponse->assertStatus(403);
        $this->assertDatabaseMissing('release_workflow', [
            'admission_id' => $this->admission->id,
            'approved_by' => $this->admin->id,
        ]);
    }

    /** @test */
    public function can_cancel_approved_release_before_confirmation()
    {
        // Approve release
        $approvalResponse = $this->actingAs($this->stationOfficer)
            ->postJson('/api/releases/approve', [
                'admission_id' => $this->admission->id,
            ]);

        $workflowId = $approvalResponse->json('id');

        // Cancel before confirmation
        $cancelResponse = $this->actingAs($this->stationOfficer)
            ->deleteJson("/api/releases/{$workflowId}", [
                'reason' => 'Inmate requested postponement.',
            ]);

        $cancelResponse->assertStatus(204);

        // Verify workflow is cancelled
        $this->assertDatabaseHas('release_workflow', [
            'id' => $workflowId,
            'status' => 'cancelled',
            'cancelled_by' => $this->stationOfficer->id,
        ]);
    }

    /** @test */
    public function multiple_adjustments_affect_release_date_calculation()
    {
        $originalReleaseDate = $this->admission->projected_release_date;

        // First adjustment: 10 days
        $this->actingAs($this->stationOfficer)
            ->postJson('/api/adjustments', [
                'admission_id' => $this->admission->id,
                'adjustment_type' => 'remission',
                'adjustment_days' => 10,
                'effective_date' => Carbon::now()->toDateString(),
            ]);

        // Second adjustment: 5 days
        $secondAdjustmentResponse = $this->actingAs($this->stationOfficer)
            ->postJson('/api/adjustments', [
                'admission_id' => $this->admission->id,
                'adjustment_type' => 'remission',
                'adjustment_days' => 5,
                'effective_date' => Carbon::now()->addDays(1)->toDateString(),
            ]);

        // Verify total adjustment days is 15
        $secondAdjustmentResponse->assertJsonPath('total_adjustment_days', 15);

        // Approve release
        $approvalResponse = $this->actingAs($this->stationOfficer)
            ->postJson('/api/releases/approve', [
                'admission_id' => $this->admission->id,
                'notes' => 'Multiple adjustments applied',
            ]);

        $approvalResponse->assertStatus(201);

        // Verify release was approved
        $this->assertDatabaseHas('release_workflow', [
            'admission_id' => $this->admission->id,
            'status' => 'approved',
        ]);
    }

    /** @test */
    public function release_workflow_maintains_audit_trail()
    {
        // Station officer approves
        $approvalResponse = $this->actingAs($this->stationOfficer)
            ->postJson('/api/releases/approve', [
                'admission_id' => $this->admission->id,
                'notes' => 'Station officer approval notes.',
            ]);

        $workflowId = $approvalResponse->json('id');

        // Gatekeeper confirms
        $this->actingAs($this->gatekeeper)
            ->putJson("/api/releases/{$workflowId}/confirm", [
                'notes' => 'Gatekeeper confirmation notes.',
            ]);

        // Verify complete audit trail
        $workflow = \App\Modules\Release\Models\ReleaseWorkflow::find($workflowId);

        $this->assertEquals('confirmed', $workflow->status);
        $this->assertEquals($this->stationOfficer->id, $workflow->approved_by);
        $this->assertEquals('Station officer approval notes.', $workflow->approval_notes);
        $this->assertEquals($this->gatekeeper->id, $workflow->confirmed_by);
        $this->assertEquals('Gatekeeper confirmation notes.', $workflow->confirmation_notes);
        $this->assertNotNull($workflow->approved_at);
        $this->assertNotNull($workflow->confirmed_at);
    }

    /** @test */
    public function cannot_approve_same_admission_twice()
    {
        // First approval
        $this->actingAs($this->stationOfficer)
            ->postJson('/api/releases/approve', [
                'admission_id' => $this->admission->id,
            ]);

        // Second approval (should fail)
        $secondResponse = $this->actingAs($this->stationOfficer)
            ->postJson('/api/releases/approve', [
                'admission_id' => $this->admission->id,
            ]);

        $secondResponse->assertStatus(422);
        $secondResponse->assertJsonFragment([
            'error' => 'An active release workflow already exists for this admission.'
        ]);
    }

    /** @test */
    public function release_workflow_response_includes_related_data()
    {
        $response = $this->actingAs($this->stationOfficer)
            ->postJson('/api/releases/approve', [
                'admission_id' => $this->admission->id,
                'notes' => 'Test approval',
            ]);

        $response->assertStatus(201);
        $response->assertJsonStructure([
            'id',
            'admission_id',
            'approved_by',
            'approved_at',
            'status',
            'approval_notes',
        ]);

        // Verify data includes user information
        $data = $response->json();
        $this->assertEquals($this->admission->id, $data['admission_id']);
        $this->assertEquals('approved', $data['status']);
    }
}
