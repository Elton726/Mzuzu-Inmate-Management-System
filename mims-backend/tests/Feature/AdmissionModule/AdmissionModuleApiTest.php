<?php

namespace Tests\Feature\AdmissionModule;

use App\Modules\Admissions\Models\Activity;
use App\Modules\Admissions\Models\Admission;
use App\Modules\Admissions\Models\Cell;
use App\Models\Role;
use App\Models\User;
use App\Modules\ActivityAllocation\Models\ActivitySession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdmissionModuleApiTest extends TestCase
{
    use RefreshDatabase;

    private function userWithRole(string $roleName): User
    {
        $role = Role::firstOrCreate(['name' => $roleName], ['description' => null]);

        return User::factory()->create(['role_id' => $role->id]);
    }

    public function test_reception_officer_can_create_search_and_show_inmate(): void
    {
        $user = $this->userWithRole('reception_officer');

        $create = $this->actingAs($user, 'sanctum')->postJson('/api/inmates', [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'date_of_birth' => '1990-01-01',
            'national_id' => 'NAT-12345',
        ]);
        $create->assertStatus(201)->assertJsonFragment(['first_name' => 'John', 'last_name' => 'Doe']);
        $inmateId = $create->json('id');

        $dup = $this->actingAs($user, 'sanctum')->postJson('/api/inmates/check-duplicate', [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'date_of_birth' => '1990-01-01',
        ]);
        $dup->assertStatus(200)->assertJsonFragment(['has_duplicates' => true]);

        $search = $this->actingAs($user, 'sanctum')->getJson('/api/inmates/search?q=John');
        $search->assertStatus(200)->assertJsonStructure(['data']);

        $show = $this->actingAs($user, 'sanctum')->getJson("/api/inmates/{$inmateId}");
        $show->assertStatus(200)->assertJsonFragment(['id' => $inmateId]);
    }

    public function test_reception_officer_can_upload_document(): void
    {
        Storage::fake('public');

        $user = $this->userWithRole('reception_officer');

        $inmate = $this->actingAs($user, 'sanctum')->postJson('/api/inmates', [
            'first_name' => 'Alice',
            'last_name' => 'Smith',
            'date_of_birth' => '1995-02-03',
        ])->assertStatus(201)->json();

        $file = UploadedFile::fake()->create('warrant.pdf', 20, 'application/pdf');

        $response = $this->actingAs($user, 'sanctum')->post('/api/documents', [
            'inmate_id' => $inmate['id'],
            'document_type' => 'committal_warrant',
            'description' => 'Test warrant',
            'file' => $file,
        ]);

        $response->assertStatus(201)->assertJsonFragment(['document_type' => 'committal_warrant']);
        Storage::disk('public')->assertExists($response->json('file_path'));
    }

    public function test_reception_officer_can_create_and_view_admission_and_stats(): void
    {
        Storage::fake('public');

        $user = $this->userWithRole('reception_officer');
        $officer = $this->userWithRole('officer_on_duty');

        // Seed minimal cells/activities for list endpoints and allocations.
        Cell::create([
            'cell_number' => 'B-201',
            'block' => 'B',
            'security_classification' => 'medium',
            'capacity' => 6,
            'current_occupancy' => 0,
            'status' => 'available',
        ]);

        Activity::create([
            'name' => 'Kitchen',
            'activity_type' => 'internal',
            'eligibility_criteria' => ['allowed_inmate_types' => ['convict']],
            'is_active' => true,
        ]);

        $cells = $this->actingAs($user, 'sanctum')->getJson('/api/cells/available');
        $cells->assertStatus(200)->assertJsonFragment(['cell_number' => 'B-201']);

        $allCells = $this->actingAs($user, 'sanctum')->getJson('/api/cells');
        $allCells->assertStatus(200)->assertJsonFragment([
            'cell_number' => 'B-201',
            'current_occupancy' => 0,
            'capacity' => 6,
        ]);

        $activities = $this->actingAs($user, 'sanctum')->getJson('/api/activities');
        $activities->assertStatus(200)->assertJsonFragment(['name' => 'Kitchen']);

        $inmate = $this->actingAs($user, 'sanctum')->postJson('/api/inmates', [
            'first_name' => 'Bob',
            'last_name' => 'Moyo',
            'date_of_birth' => '1988-05-06',
        ])->assertStatus(201)->json();

        $doc = $this->actingAs($user, 'sanctum')->post('/api/documents', [
            'inmate_id' => $inmate['id'],
            'document_type' => 'committal_warrant',
            'file' => UploadedFile::fake()->create('warrant.pdf', 20, 'application/pdf'),
        ])->assertStatus(201)->json();

        $admission = $this->actingAs($user, 'sanctum')->postJson('/api/admissions', [
            'inmate_id' => $inmate['id'],
            'admission_date' => now()->toDateString(),
            'admission_type' => 'first_time',
            'inmate_type' => 'convict',
            'case_number' => 'CR-123/2026',
            'sentence_years' => 1,
            'sentence_months' => 0,
            'sentence_start_date' => now()->toDateString(),
            'committal_warrant_id' => $doc['id'],
        ]);
        $admission->assertStatus(201)->assertJsonFragment(['case_number' => 'CR-123/2026']);
        $admissionId = $admission->json('id');

        $second = $this->actingAs($user, 'sanctum')->postJson('/api/admissions', [
            'inmate_id' => $inmate['id'],
            'admission_date' => now()->toDateString(),
            'admission_type' => 'repeat',
            'inmate_type' => 'convict',
            'case_number' => 'CR-SECOND',
            'sentence_years' => 1,
            'sentence_months' => 0,
            'sentence_start_date' => now()->toDateString(),
        ]);
        $second->assertStatus(422);

        $show = $this->actingAs($user, 'sanctum')->getJson("/api/admissions/{$admissionId}");
        $show->assertStatus(200)->assertJsonFragment(['id' => $admissionId]);

        $stats = $this->actingAs($user, 'sanctum')->getJson('/api/statistics/population');
        $stats->assertStatus(200)->assertJsonStructure(['total_inmates']);

        $assignedActivityId = data_get($show->json(), 'inmate_activities.0.activity.id')
            ?? data_get($show->json(), 'inmateActivities.0.activity.id');

        $session = ActivitySession::query()->create([
            'activity_id' => $assignedActivityId,
            'session_date' => now()->toDateString(),
            'session_time' => 'Morning',
            'supervising_officer_id' => $officer->id,
            'status' => 'scheduled',
            'created_by' => $officer->id,
        ]);

        $showWithSession = $this->actingAs($user, 'sanctum')->getJson("/api/admissions/{$admissionId}");
        $showWithSession->assertStatus(200)->assertJsonFragment([
            'id' => $session->id,
            'status' => 'scheduled',
        ]);
    }

    public function test_admission_type_is_discovered_and_remand_duration_is_stored(): void
    {
        $user = $this->userWithRole('reception_officer');

        Cell::create([
            'cell_number' => 'R-101',
            'block' => 'R',
            'security_classification' => 'minimum',
            'capacity' => 8,
            'current_occupancy' => 0,
            'status' => 'available',
        ]);

        $inmate = $this->actingAs($user, 'sanctum')->postJson('/api/inmates', [
            'first_name' => 'Remand',
            'last_name' => 'Duration',
            'date_of_birth' => '1990-01-01',
        ])->assertStatus(201)->json();

        $admission = $this->actingAs($user, 'sanctum')->postJson('/api/admissions', [
            'inmate_id' => $inmate['id'],
            'admission_date' => '2026-06-18',
            'admission_type' => 'repeat',
            'inmate_type' => 'remandee',
            'case_number' => 'RM-001',
            'remand_next_court_date' => '2026-06-28',
        ]);

        $admission->assertStatus(201)->assertJsonFragment([
            'admission_type' => 'first_time',
            'remand_duration_days' => 10,
        ]);
    }

    public function test_remand_next_court_date_must_be_after_admission_date(): void
    {
        $user = $this->userWithRole('reception_officer');

        $inmate = $this->actingAs($user, 'sanctum')->postJson('/api/inmates', [
            'first_name' => 'Invalid',
            'last_name' => 'Remand',
            'date_of_birth' => '1990-01-01',
        ])->assertStatus(201)->json();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/admissions', [
            'inmate_id' => $inmate['id'],
            'admission_date' => '2026-06-18',
            'inmate_type' => 'remandee',
            'case_number' => 'RM-002',
            'remand_next_court_date' => '2026-06-18',
        ]);

        $response->assertStatus(422);
    }

    public function test_inmate_with_completed_admission_cannot_be_admitted_again(): void
    {
        $user = $this->userWithRole('reception_officer');

        $inmate = $this->actingAs($user, 'sanctum')->postJson('/api/inmates', [
            'first_name' => 'Already',
            'last_name' => 'Admitted',
            'date_of_birth' => '1990-01-01',
        ])->assertStatus(201)->json();

        Admission::query()->create([
            'inmate_id' => $inmate['id'],
            'admission_date' => '2026-06-01',
            'admission_type' => 'first_time',
            'inmate_type' => 'remandee',
            'case_number' => 'RM-OLD',
            'remand_next_court_date' => '2026-06-10',
            'remand_duration_days' => 9,
            'admitted_by' => $user->id,
            'is_current' => false,
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/admissions', [
            'inmate_id' => $inmate['id'],
            'admission_date' => '2026-06-18',
            'inmate_type' => 'remandee',
            'case_number' => 'RM-NEW',
            'remand_next_court_date' => '2026-06-28',
        ]);

        $response->assertStatus(422)->assertJsonFragment([
            'message' => 'This inmate already has a completed admission and cannot be admitted again through this flow.',
        ]);
    }

    public function test_can_admit_existing_remandee_as_convict(): void
    {
        $user = $this->userWithRole('reception_officer');
        $inmate = $this->actingAs($user, 'sanctum')->postJson('/api/inmates', [
            'first_name' => 'John',
            'last_name' => 'Remandee',
            'date_of_birth' => '1995-05-15',
        ])->assertStatus(201)->json();

        // Create an active remand admission
        $admission = Admission::create([
            'inmate_id' => $inmate['id'],
            'admission_date' => '2026-06-01',
            'admission_type' => 'first_time',
            'inmate_type' => 'remandee',
            'case_number' => 'RM-101',
            'remand_next_court_date' => '2026-06-10',
            'remand_duration_days' => 9,
            'admitted_by' => $user->id,
            'is_current' => true,
        ]);

        // Create a medium security cell for the convict auto-allocation
        Cell::create([
            'cell_number' => 'B-201',
            'block' => 'B',
            'security_classification' => 'medium',
            'capacity' => 10,
            'current_occupancy' => 0,
            'status' => 'available',
        ]);

        // Admit the same inmate as a convict
        $response = $this->actingAs($user, 'sanctum')->postJson('/api/admissions', [
            'inmate_id' => $inmate['id'],
            'admission_date' => '2026-06-18',
            'inmate_type' => 'convict',
            'case_number' => 'CR-101',
            'sentence_years' => 5,
            'sentence_months' => 0,
            'sentence_start_date' => '2026-06-18',
        ]);

        $response->assertStatus(201);

        // Verify that the old admission is no longer current
        $admission->refresh();
        $this->assertFalse($admission->is_current);

        // Verify that the new admission is current
        $newAdmission = Admission::where('inmate_id', $inmate['id'])->where('is_current', true)->first();
        $this->assertNotNull($newAdmission);
        $this->assertEquals('convict', $newAdmission->inmate_type);
        $this->assertEquals('CR-101', $newAdmission->case_number);
    }


    public function test_station_officer_cannot_access_admissions_module(): void
    {
        $station = $this->userWithRole('station_officer');
        $reception = $this->userWithRole('reception_officer');

        $inmate = $this->actingAs($reception, 'sanctum')->postJson('/api/inmates', [
            'first_name' => 'View',
            'last_name' => 'Only',
            'date_of_birth' => '1999-01-01',
        ])->assertStatus(201)->json();

        // station_officer has read access to inmates and check-duplicate
        $this->actingAs($station, 'sanctum')->getJson("/api/inmates/{$inmate['id']}")->assertStatus(200);
        $this->actingAs($station, 'sanctum')->getJson('/api/inmates/search?q=View')->assertStatus(200);
        $this->actingAs($station, 'sanctum')->postJson('/api/inmates/check-duplicate', [
            'first_name' => 'View',
            'last_name' => 'Only',
            'date_of_birth' => '1999-01-01',
        ])->assertStatus(200);

        // station_officer cannot write/create inmates
        $this->actingAs($station, 'sanctum')->postJson('/api/inmates', [
            'first_name' => 'No',
            'last_name' => 'Create',
            'date_of_birth' => '2000-01-01',
        ])->assertStatus(403);

        // station_officer cannot write/create admissions
        $this->actingAs($station, 'sanctum')->postJson('/api/admissions', [
            'inmate_id' => $inmate['id'],
            'admission_date' => now()->toDateString(),
            'admission_type' => 'first_time',
            'inmate_type' => 'convict',
            'case_number' => 'CR-LOCKED',
            'sentence_years' => 1,
            'sentence_start_date' => now()->toDateString(),
        ])->assertStatus(403);

        $admission = Admission::query()->create([
            'inmate_id' => $inmate['id'],
            'admission_date' => now()->toDateString(),
            'admission_type' => 'first_time',
            'inmate_type' => 'remandee',
            'case_number' => 'CR-VIEW',
            'admitted_by' => $reception->id,
            'is_current' => true,
        ]);

        // station_officer has read access to admissions
        $this->actingAs($station, 'sanctum')->getJson("/api/admissions/{$admission->id}")->assertStatus(200);
    }

    public function test_weighted_scoring_and_override_justification(): void
    {
        $user = $this->userWithRole('reception_officer');

        // Create an initial inmate
        $original = $this->actingAs($user, 'sanctum')->postJson('/api/inmates', [
            'first_name' => 'Michael',
            'last_name' => 'Phiri',
            'date_of_birth' => '1992-05-15',
            'nationality' => 'Malawian',
            'gender' => 'male',
            'next_of_kin_name' => 'Grace Phiri',
        ]);
        $original->assertStatus(201);

        // 1. Check duplicate with similar details (Michael Phiri born 1992-05-15, same NOK and gender)
        $dupCheck = $this->actingAs($user, 'sanctum')->postJson('/api/inmates/check-duplicate', [
            'first_name' => 'Michael',
            'last_name' => 'Phiri',
            'date_of_birth' => '1992-05-15',
            'nationality' => 'Malawian',
            'gender' => 'male',
            'next_of_kin_name' => 'Grace Phiri',
        ]);
        $dupCheck->assertStatus(200);
        $this->assertTrue($dupCheck->json('has_duplicates'));
        $this->assertGreaterThanOrEqual(80, $dupCheck->json('matches.0.similarity_score'));

        // 2. Try creating a duplicate inmate without override_justification (should fail with 422 validation error)
        $failCreate = $this->actingAs($user, 'sanctum')->postJson('/api/inmates', [
            'first_name' => 'Michael',
            'last_name' => 'Phiri',
            'date_of_birth' => '1992-05-15',
            'nationality' => 'Malawian',
            'gender' => 'male',
            'next_of_kin_name' => 'Grace Phiri',
        ]);
        $failCreate->assertStatus(422);
        $failCreate->assertJsonValidationErrors(['duplicate']);

        // 3. Create the duplicate inmate WITH override_justification (should succeed)
        $successCreate = $this->actingAs($user, 'sanctum')->postJson('/api/inmates', [
            'first_name' => 'Michael',
            'last_name' => 'Phiri',
            'date_of_birth' => '1992-05-15',
            'nationality' => 'Malawian',
            'gender' => 'male',
            'next_of_kin_name' => 'Grace Phiri',
            'override_justification' => 'Verified different parents and physical scars.',
        ]);
        $successCreate->assertStatus(201);
        $this->assertEquals('Verified different parents and physical scars.', $successCreate->json('override_justification'));
    }

    public function test_admin_can_view_audit_logs_but_non_admin_cannot(): void
    {
        $admin = $this->userWithRole('admin');
        $nonAdmin = $this->userWithRole('reception_officer');

        // Create something that writes an audit log (document upload).
        Storage::fake('public');
        $inmate = $this->actingAs($nonAdmin, 'sanctum')->postJson('/api/inmates', [
            'first_name' => 'Audit',
            'last_name' => 'Log',
            'date_of_birth' => '1991-01-01',
        ])->assertStatus(201)->json();

        $this->actingAs($nonAdmin, 'sanctum')->post('/api/documents', [
            'inmate_id' => $inmate['id'],
            'document_type' => 'committal_warrant',
            'file' => UploadedFile::fake()->create('warrant.pdf', 20, 'application/pdf'),
        ])->assertStatus(201);

        $this->actingAs($admin, 'sanctum')->getJson('/api/audit-logs')
            ->assertStatus(200)
            ->assertJsonStructure(['data']);

        $this->actingAs($nonAdmin, 'sanctum')->getJson('/api/audit-logs')->assertStatus(403);
    }
}
