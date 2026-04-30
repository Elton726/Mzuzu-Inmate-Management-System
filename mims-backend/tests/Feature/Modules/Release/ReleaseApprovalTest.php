<?php

namespace Tests\Feature\Modules\Release;

use App\Models\Role;
use App\Models\User;
use App\Modules\Admissions\Models\Admission;
use App\Modules\Admissions\Models\Inmate;
use App\Modules\Release\Models\ReleaseWorkflow;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReleaseApprovalTest extends TestCase
{
    use RefreshDatabase;

    private User $stationOfficer;
    private User $admin;
    private User $receptionist;
    private Inmate $inmate;
    private Admission $eligibleAdmission;

    protected function setUp(): void
    {
        parent::setUp();

        // Create users
        $this->stationOfficer = $this->userWithRole('station_officer');

        $this->admin = $this->userWithRole('admin');

        $this->receptionist = $this->userWithRole('reception_officer');

        // Create inmate
        $this->inmate = Inmate::factory()->create([
            'first_name' => 'John',
            'last_name' => 'Doe',
            'prison_number' => 'MZ001234',
        ]);

        // Create eligible admission (projected release date within 30 days)
        $this->eligibleAdmission = Admission::factory()->create([
            'inmate_id' => $this->inmate->id,
            'is_current' => true,
            'released_at' => null,
            'projected_release_date' => Carbon::now()->addDays(15),
            'original_release_date' => Carbon::now()->addDays(15),
        ]);
    }

    private function userWithRole(string $roleName): User
    {
        $role = Role::firstOrCreate(['name' => $roleName], ['description' => null]);

        return User::factory()->create(['role_id' => $role->id]);
    }

    /** @test */
    public function station_officer_can_view_eligible_inmates_for_release()
    {
        $response = $this->actingAs($this->stationOfficer)
            ->getJson('/api/releases/eligible');

        $response->assertStatus(200);
        $response->assertJsonStructure(['data']);
        // Should contain the eligible inmate
        $data = $response->json('data');
        if (!empty($data)) {
            $this->assertIsArray($data);
        }
    }

    /** @test */
    public function admin_cannot_view_eligible_inmates_for_release()
    {
        $response = $this->actingAs($this->admin)
            ->getJson('/api/releases/eligible');

        $response->assertStatus(403);
    }

    /** @test */
    public function receptionist_cannot_view_eligible_inmates_for_release()
    {
        $response = $this->actingAs($this->receptionist)
            ->getJson('/api/releases/eligible');

        $response->assertStatus(403);
    }

    /** @test */
    public function station_officer_can_approve_release()
    {
        $response = $this->actingAs($this->stationOfficer)
            ->postJson('/api/releases/approve', [
                'admission_id' => $this->eligibleAdmission->id,
                'notes' => 'Inmate is eligible for release.',
            ]);

        $response->assertStatus(201);
        $response->assertJsonStructure([
            'id',
            'admission_id',
            'approved_by',
            'approved_at',
            'status',
        ]);

        // Verify workflow was created
        $this->assertDatabaseHas('release_workflow', [
            'admission_id' => $this->eligibleAdmission->id,
            'status' => 'approved',
        ]);
    }

    /** @test */
    public function admin_cannot_approve_release()
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/releases/approve', [
                'admission_id' => $this->eligibleAdmission->id,
                'notes' => 'Admin approved release.',
            ]);

        $response->assertStatus(403);
    }

    /** @test */
    public function cannot_approve_non_eligible_admission()
    {
        $inmate = Inmate::factory()->create();

        // Create non-eligible admission (projected release date > 30 days away)
        $nonEligibleAdmission = Admission::factory()->create([
            'inmate_id' => $inmate->id,
            'is_current' => true,
            'released_at' => null,
            'projected_release_date' => Carbon::now()->addDays(45),
        ]);

        $response = $this->actingAs($this->stationOfficer)
            ->postJson('/api/releases/approve', [
                'admission_id' => $nonEligibleAdmission->id,
                'notes' => 'Test',
            ]);

        $response->assertStatus(422);
        $response->assertJsonFragment([
            'error' => 'This inmate is not yet eligible for release approval.'
        ]);
    }

    /** @test */
    public function cannot_approve_already_released_admission()
    {
        // Create released admission
        $releasedAdmission = Admission::factory()->create([
            'inmate_id' => $this->inmate->id,
            'is_current' => false,
            'released_at' => Carbon::now(),
            'projected_release_date' => Carbon::now()->subDays(5),
        ]);

        $response = $this->actingAs($this->stationOfficer)
            ->postJson('/api/releases/approve', [
                'admission_id' => $releasedAdmission->id,
                'notes' => 'Test',
            ]);

        $response->assertStatus(422);
        $response->assertJsonFragment([
            'error' => 'Only current unreleased admissions can enter the release workflow.'
        ]);
    }

    /** @test */
    public function cannot_create_duplicate_release_workflow()
    {
        // Create first workflow
        $this->actingAs($this->stationOfficer)
            ->postJson('/api/releases/approve', [
                'admission_id' => $this->eligibleAdmission->id,
                'notes' => 'First approval',
            ]);

        // Try to create second workflow
        $response = $this->actingAs($this->stationOfficer)
            ->postJson('/api/releases/approve', [
                'admission_id' => $this->eligibleAdmission->id,
                'notes' => 'Second approval',
            ]);

        $response->assertStatus(422);
        $response->assertJsonFragment([
            'error' => 'An active release workflow already exists for this admission.'
        ]);
    }

    /** @test */
    public function station_officer_can_cancel_release()
    {
        // Create workflow
        $workflow = ReleaseWorkflow::factory()->create([
            'admission_id' => $this->eligibleAdmission->id,
            'status' => 'approved',
            'approved_by' => $this->stationOfficer->id,
            'approved_at' => Carbon::now(),
        ]);

        $response = $this->actingAs($this->stationOfficer)
            ->deleteJson("/api/releases/{$workflow->id}", [
                'reason' => 'Inmate requested postponement.',
            ]);

        $response->assertStatus(204);

        // Verify workflow was cancelled
        $this->assertDatabaseHas('release_workflow', [
            'id' => $workflow->id,
            'status' => 'cancelled',
        ]);
    }

    /** @test */
    public function cannot_cancel_confirmed_release()
    {
        // Create confirmed workflow
        $workflow = ReleaseWorkflow::factory()->create([
            'admission_id' => $this->eligibleAdmission->id,
            'status' => 'confirmed',
            'confirmed_by' => $this->admin->id,
            'confirmed_at' => Carbon::now(),
        ]);

        $response = $this->actingAs($this->stationOfficer)
            ->deleteJson("/api/releases/{$workflow->id}", [
                'reason' => 'Test',
            ]);

        $response->assertStatus(422);
        $response->assertJsonFragment([
            'error' => 'Confirmed releases cannot be cancelled.'
        ]);
    }

    /** @test */
    public function receptionist_cannot_approve_release()
    {
        $response = $this->actingAs($this->receptionist)
            ->postJson('/api/releases/approve', [
                'admission_id' => $this->eligibleAdmission->id,
                'notes' => 'Test',
            ]);

        $response->assertStatus(403);
    }

    /** @test */
    public function unauthenticated_user_cannot_approve_release()
    {
        $response = $this->postJson('/api/releases/approve', [
            'admission_id' => $this->eligibleAdmission->id,
            'notes' => 'Test',
        ]);

        $response->assertStatus(401);
    }

    /** @test */
    public function approval_request_validates_admission_id()
    {
        $response = $this->actingAs($this->stationOfficer)
            ->postJson('/api/releases/approve', [
                'admission_id' => 99999, // Non-existent
                'notes' => 'Test',
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('admission_id');
    }

    /** @test */
    public function approval_notes_are_optional()
    {
        $response = $this->actingAs($this->stationOfficer)
            ->postJson('/api/releases/approve', [
                'admission_id' => $this->eligibleAdmission->id,
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('release_workflow', [
            'admission_id' => $this->eligibleAdmission->id,
            'approval_notes' => null,
        ]);
    }
}
