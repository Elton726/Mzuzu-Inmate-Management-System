<?php

namespace Tests\Feature\Modules\Release;

use App\Models\User;
use App\Modules\Admissions\Models\Admission;
use App\Modules\Admissions\Models\Inmate;
use App\Modules\Release\Models\SentenceAdjustment;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SentenceAdjustmentTest extends TestCase
{
    use RefreshDatabase;

    private User $stationOfficer;
    private User $admin;
    private User $receptionist;
    private Inmate $inmate;
    private Admission $admission;

    protected function setUp(): void
    {
        parent::setUp();

        // Create users
        $this->stationOfficer = User::factory()
            ->hasAttached(\Spatie\Permission\Models\Role::firstOrCreate(['name' => 'station_officer']))
            ->create();

        $this->admin = User::factory()
            ->hasAttached(\Spatie\Permission\Models\Role::firstOrCreate(['name' => 'admin']))
            ->create();

        $this->receptionist = User::factory()
            ->hasAttached(\Spatie\Permission\Models\Role::firstOrCreate(['name' => 'reception_officer']))
            ->create();

        // Create inmate and admission
        $this->inmate = Inmate::factory()->create();
        $this->admission = Admission::factory()->create([
            'inmate_id' => $this->inmate->id,
            'is_current' => true,
            'released_at' => null,
            'original_release_date' => Carbon::now()->addDays(365),
            'projected_release_date' => Carbon::now()->addDays(365),
        ]);
    }

    /** @test */
    public function station_officer_can_view_adjustments_for_admission()
    {
        // Create some adjustments
        SentenceAdjustment::factory(3)->create([
            'admission_id' => $this->admission->id,
        ]);

        $response = $this->actingAs($this->stationOfficer)
            ->getJson("/api/adjustments/{$this->admission->id}");

        $response->assertStatus(200);
        $response->assertJsonStructure(['data']);
        $data = $response->json('data');
        $this->assertCount(3, $data);
    }

    /** @test */
    public function admin_can_view_adjustments_for_admission()
    {
        $response = $this->actingAs($this->admin)
            ->getJson("/api/adjustments/{$this->admission->id}");

        $response->assertStatus(200);
        $response->assertJsonStructure(['data']);
    }

    /** @test */
    public function receptionist_cannot_view_adjustments_for_admission()
    {
        $response = $this->actingAs($this->receptionist)
            ->getJson("/api/adjustments/{$this->admission->id}");

        $response->assertStatus(403);
    }

    /** @test */
    public function station_officer_can_apply_remission_adjustment()
    {
        $response = $this->actingAs($this->stationOfficer)
            ->postJson('/api/adjustments', [
                'admission_id' => $this->admission->id,
                'adjustment_type' => 'remission',
                'adjustment_days' => 90,
                'effective_date' => Carbon::now()->toDateString(),
                'reason' => 'Good behaviour',
            ]);

        $response->assertStatus(201);
        $response->assertJsonStructure([
            'adjustment' => [
                'id',
                'admission_id',
                'adjustment_type',
                'adjustment_days',
            ],
            'new_projected_release_date',
            'total_adjustment_days',
        ]);

        // Verify adjustment was created
        $this->assertDatabaseHas('sentence_adjustments', [
            'admission_id' => $this->admission->id,
            'adjustment_type' => 'remission',
            'adjustment_days' => 90,
        ]);
    }

    /** @test */
    public function station_officer_can_apply_pardon_adjustment()
    {
        $response = $this->actingAs($this->stationOfficer)
            ->postJson('/api/adjustments', [
                'admission_id' => $this->admission->id,
                'adjustment_type' => 'pardon',
                'adjustment_days' => 180,
                'effective_date' => Carbon::now()->toDateString(),
                'reason' => 'Presidential pardon',
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('sentence_adjustments', [
            'adjustment_type' => 'pardon',
        ]);
    }

    /** @test */
    public function station_officer_can_apply_reduction_adjustment()
    {
        $response = $this->actingAs($this->stationOfficer)
            ->postJson('/api/adjustments', [
                'admission_id' => $this->admission->id,
                'adjustment_type' => 'reduction',
                'adjustment_days' => 120,
                'effective_date' => Carbon::now()->toDateString(),
                'reason' => 'Court appeal decision',
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('sentence_adjustments', [
            'adjustment_type' => 'reduction',
        ]);
    }

    /** @test */
    public function admin_can_apply_adjustment()
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/adjustments', [
                'admission_id' => $this->admission->id,
                'adjustment_type' => 'remission',
                'adjustment_days' => 60,
                'effective_date' => Carbon::now()->toDateString(),
                'reason' => 'Admin adjustment',
            ]);

        $response->assertStatus(201);
    }

    /** @test */
    public function cannot_apply_adjustment_with_invalid_type()
    {
        $response = $this->actingAs($this->stationOfficer)
            ->postJson('/api/adjustments', [
                'admission_id' => $this->admission->id,
                'adjustment_type' => 'invalid_type',
                'adjustment_days' => 90,
                'effective_date' => Carbon::now()->toDateString(),
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('adjustment_type');
    }

    /** @test */
    public function adjustment_days_must_be_at_least_one()
    {
        $response = $this->actingAs($this->stationOfficer)
            ->postJson('/api/adjustments', [
                'admission_id' => $this->admission->id,
                'adjustment_type' => 'remission',
                'adjustment_days' => 0,
                'effective_date' => Carbon::now()->toDateString(),
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('adjustment_days');
    }

    /** @test */
    public function cannot_apply_adjustment_to_released_admission()
    {
        $releasedAdmission = Admission::factory()->create([
            'inmate_id' => $this->inmate->id,
            'is_current' => false,
            'released_at' => Carbon::now(),
        ]);

        $response = $this->actingAs($this->stationOfficer)
            ->postJson('/api/adjustments', [
                'admission_id' => $releasedAdmission->id,
                'adjustment_type' => 'remission',
                'adjustment_days' => 90,
                'effective_date' => Carbon::now()->toDateString(),
            ]);

        $response->assertStatus(422);
        $response->assertJsonFragment([
            'error' => 'Sentence adjustments can only be applied to current unreleased admissions.'
        ]);
    }

    /** @test */
    public function cannot_apply_adjustment_to_nonexistent_admission()
    {
        $response = $this->actingAs($this->stationOfficer)
            ->postJson('/api/adjustments', [
                'admission_id' => 99999,
                'adjustment_type' => 'remission',
                'adjustment_days' => 90,
                'effective_date' => Carbon::now()->toDateString(),
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('admission_id');
    }

    /** @test */
    public function adjustment_reason_is_optional()
    {
        $response = $this->actingAs($this->stationOfficer)
            ->postJson('/api/adjustments', [
                'admission_id' => $this->admission->id,
                'adjustment_type' => 'remission',
                'adjustment_days' => 90,
                'effective_date' => Carbon::now()->toDateString(),
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('sentence_adjustments', [
            'admission_id' => $this->admission->id,
            'reason' => null,
        ]);
    }

    /** @test */
    public function admin_can_delete_adjustment()
    {
        $adjustment = SentenceAdjustment::factory()->create([
            'admission_id' => $this->admission->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->deleteJson("/api/adjustments/{$adjustment->id}");

        $response->assertStatus(204);

        // Verify adjustment was deleted
        $this->assertDatabaseMissing('sentence_adjustments', [
            'id' => $adjustment->id,
        ]);
    }

    /** @test */
    public function station_officer_cannot_delete_adjustment()
    {
        $adjustment = SentenceAdjustment::factory()->create([
            'admission_id' => $this->admission->id,
        ]);

        $response = $this->actingAs($this->stationOfficer)
            ->deleteJson("/api/adjustments/{$adjustment->id}");

        $response->assertStatus(403);

        // Verify adjustment still exists
        $this->assertDatabaseHas('sentence_adjustments', [
            'id' => $adjustment->id,
        ]);
    }

    /** @test */
    public function receptionist_cannot_apply_adjustment()
    {
        $response = $this->actingAs($this->receptionist)
            ->postJson('/api/adjustments', [
                'admission_id' => $this->admission->id,
                'adjustment_type' => 'remission',
                'adjustment_days' => 90,
                'effective_date' => Carbon::now()->toDateString(),
            ]);

        $response->assertStatus(403);
    }

    /** @test */
    public function unauthenticated_user_cannot_apply_adjustment()
    {
        $response = $this->postJson('/api/adjustments', [
            'admission_id' => $this->admission->id,
            'adjustment_type' => 'remission',
            'adjustment_days' => 90,
            'effective_date' => Carbon::now()->toDateString(),
        ]);

        $response->assertStatus(401);
    }

    /** @test */
    public function multiple_adjustments_can_be_applied_to_same_admission()
    {
        // First adjustment
        $this->actingAs($this->stationOfficer)
            ->postJson('/api/adjustments', [
                'admission_id' => $this->admission->id,
                'adjustment_type' => 'remission',
                'adjustment_days' => 90,
                'effective_date' => Carbon::now()->toDateString(),
            ]);

        // Second adjustment
        $response = $this->actingAs($this->stationOfficer)
            ->postJson('/api/adjustments', [
                'admission_id' => $this->admission->id,
                'adjustment_type' => 'pardon',
                'adjustment_days' => 60,
                'effective_date' => Carbon::now()->addDays(10)->toDateString(),
            ]);

        $response->assertStatus(201);

        // Verify both adjustments exist
        $this->assertDatabaseHas('sentence_adjustments', [
            'admission_id' => $this->admission->id,
            'adjustment_type' => 'remission',
        ]);

        $this->assertDatabaseHas('sentence_adjustments', [
            'admission_id' => $this->admission->id,
            'adjustment_type' => 'pardon',
        ]);

        // Total adjustment days should be 150
        $response->assertJsonPath('total_adjustment_days', 150);
    }

    /** @test */
    public function adjustment_response_includes_new_release_date()
    {
        $response = $this->actingAs($this->stationOfficer)
            ->postJson('/api/adjustments', [
                'admission_id' => $this->admission->id,
                'adjustment_type' => 'remission',
                'adjustment_days' => 30,
                'effective_date' => Carbon::now()->toDateString(),
                'reason' => 'Test',
            ]);

        $response->assertStatus(201);
        $response->assertJsonStructure([
            'new_projected_release_date',
            'total_adjustment_days',
            'adjustment' => [
                'approved_by',
            ]
        ]);
    }

    /** @test */
    public function view_adjustments_for_nonexistent_admission()
    {
        $response = $this->actingAs($this->stationOfficer)
            ->getJson("/api/adjustments/99999");

        $response->assertStatus(404);
    }
}
