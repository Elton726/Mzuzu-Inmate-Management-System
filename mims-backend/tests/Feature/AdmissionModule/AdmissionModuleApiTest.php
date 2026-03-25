<?php

namespace Tests\Feature\AdmissionModule;

use App\Models\Activity;
use App\Models\Admission;
use App\Models\Cell;
use App\Models\Role;
use App\Models\User;
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

    public function test_reception_officer_can_create_search_show_and_update_inmate(): void
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

        $update = $this->actingAs($user, 'sanctum')->putJson("/api/inmates/{$inmateId}", [
            'next_of_kin_name' => 'Jane Doe',
            'next_of_kin_contact' => '0999-000-111',
        ]);
        $update->assertStatus(200)->assertJsonFragment(['message' => 'Inmate updated successfully.']);
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

        // Seed minimal cells/activities for list endpoints and allocations.
        Cell::create([
            'cell_number' => 'C-301',
            'block' => 'C',
            'security_classification' => 'minimum',
            'capacity' => 8,
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
        $cells->assertStatus(200)->assertJsonFragment(['cell_number' => 'C-301']);

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

        $show = $this->actingAs($user, 'sanctum')->getJson("/api/admissions/{$admissionId}");
        $show->assertStatus(200)->assertJsonFragment(['id' => $admissionId]);

        $stats = $this->actingAs($user, 'sanctum')->getJson('/api/statistics/population');
        $stats->assertStatus(200)->assertJsonStructure(['total_inmates']);
    }

    public function test_station_officer_can_view_but_cannot_create_inmate_or_admission(): void
    {
        $station = $this->userWithRole('station_officer');
        $reception = $this->userWithRole('reception_officer');

        $inmate = $this->actingAs($reception, 'sanctum')->postJson('/api/inmates', [
            'first_name' => 'View',
            'last_name' => 'Only',
            'date_of_birth' => '1999-01-01',
        ])->assertStatus(201)->json();

        $this->actingAs($station, 'sanctum')->getJson("/api/inmates/{$inmate['id']}")->assertStatus(200);
        $this->actingAs($station, 'sanctum')->getJson('/api/inmates/search?q=View')->assertStatus(200);
        $this->actingAs($station, 'sanctum')->postJson('/api/inmates/check-duplicate', [
            'first_name' => 'View',
            'last_name' => 'Only',
            'date_of_birth' => '1999-01-01',
        ])->assertStatus(200);

        $this->actingAs($station, 'sanctum')->postJson('/api/inmates', [
            'first_name' => 'No',
            'last_name' => 'Create',
            'date_of_birth' => '2000-01-01',
        ])->assertStatus(403);

        $this->actingAs($station, 'sanctum')->postJson('/api/admissions', [
            'inmate_id' => $inmate['id'],
            'admission_date' => now()->toDateString(),
            'admission_type' => 'first_time',
            'inmate_type' => 'convict',
            'case_number' => 'CR-LOCKED',
            'sentence_years' => 1,
            'sentence_start_date' => now()->toDateString(),
        ])->assertStatus(403);
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

