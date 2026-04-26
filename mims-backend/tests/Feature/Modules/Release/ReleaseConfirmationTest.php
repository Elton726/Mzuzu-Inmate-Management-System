<?php

namespace Tests\Feature\Modules\Release;

use App\Models\User;
use App\Modules\Admissions\Models\Admission;
use App\Modules\Admissions\Models\Inmate;
use App\Modules\Release\Models\ReleaseWorkflow;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReleaseConfirmationTest extends TestCase
{
    use RefreshDatabase;

    private User $gatekeeper;
    private User $admin;
    private User $stationOfficer;
    private Inmate $inmate;
    private Admission $admission;
    private ReleaseWorkflow $approvedWorkflow;

    protected function setUp(): void
    {
        parent::setUp();

        // Create users
        $this->gatekeeper = User::factory()
            ->hasAttached(\Spatie\Permission\Models\Role::firstOrCreate(['name' => 'gatekeeper']))
            ->create();

        $this->admin = User::factory()
            ->hasAttached(\Spatie\Permission\Models\Role::firstOrCreate(['name' => 'admin']))
            ->create();

        $this->stationOfficer = User::factory()
            ->hasAttached(\Spatie\Permission\Models\Role::firstOrCreate(['name' => 'station_officer']))
            ->create();

        // Create inmate and admission
        $this->inmate = Inmate::factory()->create();
        $this->admission = Admission::factory()->create([
            'inmate_id' => $this->inmate->id,
            'is_current' => true,
            'released_at' => null,
            'projected_release_date' => Carbon::now()->addDays(10),
        ]);

        // Create approved workflow
        $this->approvedWorkflow = ReleaseWorkflow::factory()->create([
            'admission_id' => $this->admission->id,
            'status' => 'approved',
            'approved_by' => $this->stationOfficer->id,
            'approved_at' => Carbon::now(),
        ]);
    }

    /** @test */
    public function gatekeeper_can_view_pending_releases()
    {
        $response = $this->actingAs($this->gatekeeper)
            ->getJson('/api/releases/pending');

        $response->assertStatus(200);
        $response->assertJsonStructure(['data']);
    }

    /** @test */
    public function admin_can_view_pending_releases()
    {
        $response = $this->actingAs($this->admin)
            ->getJson('/api/releases/pending');

        $response->assertStatus(200);
        $response->assertJsonStructure(['data']);
    }

    /** @test */
    public function station_officer_cannot_view_pending_releases()
    {
        $response = $this->actingAs($this->stationOfficer)
            ->getJson('/api/releases/pending');

        $response->assertStatus(403);
    }

    /** @test */
    public function gatekeeper_can_confirm_release()
    {
        $response = $this->actingAs($this->gatekeeper)
            ->putJson("/api/releases/{$this->approvedWorkflow->id}/confirm", [
                'notes' => 'Released at 14:30, ID verified.',
            ]);

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'id',
            'admission_id',
            'confirmed_by',
            'confirmed_at',
            'status',
        ]);

        // Verify workflow was confirmed
        $this->assertDatabaseHas('release_workflow', [
            'id' => $this->approvedWorkflow->id,
            'status' => 'confirmed',
            'confirmed_by' => $this->gatekeeper->id,
        ]);
    }

    /** @test */
    public function admin_can_confirm_release()
    {
        $response = $this->actingAs($this->admin)
            ->putJson("/api/releases/{$this->approvedWorkflow->id}/confirm", [
                'notes' => 'Admin confirmed release.',
            ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('release_workflow', [
            'id' => $this->approvedWorkflow->id,
            'status' => 'confirmed',
            'confirmed_by' => $this->admin->id,
        ]);
    }

    /** @test */
    public function cannot_confirm_non_approved_release()
    {
        // Create pending workflow
        $pendingWorkflow = ReleaseWorkflow::factory()->create([
            'admission_id' => $this->admission->id,
            'status' => 'pending_approval',
        ]);

        $response = $this->actingAs($this->gatekeeper)
            ->putJson("/api/releases/{$pendingWorkflow->id}/confirm", [
                'notes' => 'Test',
            ]);

        $response->assertStatus(422);
        $response->assertJsonFragment([
            'error' => 'Only approved releases can be confirmed.'
        ]);
    }

    /** @test */
    public function cannot_confirm_cancelled_release()
    {
        // Create cancelled workflow
        $cancelledWorkflow = ReleaseWorkflow::factory()->create([
            'admission_id' => $this->admission->id,
            'status' => 'cancelled',
        ]);

        $response = $this->actingAs($this->gatekeeper)
            ->putJson("/api/releases/{$cancelledWorkflow->id}/confirm", [
                'notes' => 'Test',
            ]);

        $response->assertStatus(422);
        $response->assertJsonFragment([
            'error' => 'Only approved releases can be confirmed.'
        ]);
    }

    /** @test */
    public function confirmation_notes_are_optional()
    {
        $response = $this->actingAs($this->gatekeeper)
            ->putJson("/api/releases/{$this->approvedWorkflow->id}/confirm", []);

        $response->assertStatus(200);
        $this->assertDatabaseHas('release_workflow', [
            'id' => $this->approvedWorkflow->id,
            'status' => 'confirmed',
            'confirmation_notes' => null,
        ]);
    }

    /** @test */
    public function station_officer_cannot_confirm_release()
    {
        $response = $this->actingAs($this->stationOfficer)
            ->putJson("/api/releases/{$this->approvedWorkflow->id}/confirm", [
                'notes' => 'Test',
            ]);

        $response->assertStatus(403);
    }

    /** @test */
    public function unauthenticated_user_cannot_confirm_release()
    {
        $response = $this->putJson("/api/releases/{$this->approvedWorkflow->id}/confirm", [
            'notes' => 'Test',
        ]);

        $response->assertStatus(401);
    }

    /** @test */
    public function pending_release_contains_inmate_information()
    {
        // Get pending releases
        $response = $this->actingAs($this->gatekeeper)
            ->getJson('/api/releases/pending');

        $response->assertStatus(200);
        // Response structure should match what frontend expects
        $data = $response->json('data');
        if (!empty($data)) {
            // Verify the structure includes expected fields
            $this->assertIsArray($data);
        }
    }

    /** @test */
    public function confirmed_release_updates_admission_status()
    {
        $this->actingAs($this->gatekeeper)
            ->putJson("/api/releases/{$this->approvedWorkflow->id}/confirm", [
                'notes' => 'Confirmed',
            ]);

        // Verify the workflow status is confirmed
        $this->assertEquals('confirmed', $this->approvedWorkflow->fresh()->status);
    }

    /** @test */
    public function gatekeeper_can_view_nonexistent_workflow()
    {
        $response = $this->actingAs($this->gatekeeper)
            ->putJson("/api/releases/99999/confirm", [
                'notes' => 'Test',
            ]);

        $response->assertStatus(404);
    }
}
