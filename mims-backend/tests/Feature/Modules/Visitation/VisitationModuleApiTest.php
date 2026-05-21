<?php

namespace Tests\Feature\Modules\Visitation;

use App\Models\Role;
use App\Models\User;
use App\Modules\Admissions\Models\Admission;
use App\Modules\Admissions\Models\Inmate;
use App\Modules\Visitation\Models\Visitor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VisitationModuleApiTest extends TestCase
{
    use RefreshDatabase;

    private User $visitationOfficer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->visitationOfficer = $this->userWithRole('visitation_officer');
    }

    private function userWithRole(string $roleName): User
    {
        $role = Role::firstOrCreate(['name' => $roleName], ['description' => null]);

        return User::factory()->create(['role_id' => $role->id]);
    }

    public function test_visitation_officer_can_register_and_approve_visitor()
    {
        $payload = [
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'relationship' => 'family',
            'contact_number' => '+260971234567',
            'national_id' => 'A12345',
            'email' => 'jane.doe@example.com',
        ];

        $response = $this->actingAs($this->visitationOfficer)
            ->postJson('/api/visitors', $payload);

        $response->assertStatus(201);
        $this->assertDatabaseHas('visitors', ['first_name' => 'Jane', 'is_approved' => false]);

        $visitorId = $response->json('id');
        $approveResponse = $this->actingAs($this->visitationOfficer)
            ->putJson("/api/visitors/{$visitorId}/approve");

        $approveResponse->assertStatus(200);
        $this->assertDatabaseHas('visitors', ['id' => $visitorId, 'is_approved' => true]);
    }

    public function test_visitation_officer_can_schedule_visit_for_registered_visitor()
    {
        $visitor = Visitor::create([
            'first_name' => 'Michael',
            'last_name' => 'Smith',
            'relationship' => 'friend',
            'contact_number' => '+260971234568',
            'is_approved' => true,
        ]);

        $inmate = Inmate::factory()->create([ 'first_name' => 'John', 'last_name' => 'Doe', 'prison_number' => 'MZ-0001' ]);
        $admission = Admission::factory()->create([ 'inmate_id' => $inmate->id, 'is_current' => true ]);
        $this->actingAs($this->visitationOfficer)
            ->postJson('/api/inmate-visitor-registrations', ['inmate_id' => $inmate->id, 'visitor_id' => $visitor->id]);

        $payload = [
            'inmate_id' => $inmate->id,
            'visitor_id' => $visitor->id,
            'admission_id' => $admission->id,
            'visit_date' => now()->addDay()->toDateString(),
            'visit_time' => '10:00',
            'duration_minutes' => 60,
            'location' => 'Visitor Room 2',
            'visit_purpose' => 'Regular family visit',
            'notes' => 'No issues',
        ];

        $response = $this->actingAs($this->visitationOfficer)
            ->postJson('/api/visitation-sessions', $payload);

        $response->assertStatus(201);
        $response->assertJsonFragment(['status' => 'scheduled']);
        $this->assertDatabaseHas('visitation_sessions', [
            'inmate_id' => $inmate->id,
            'visitor_id' => $visitor->id,
            'status' => 'scheduled',
        ]);
    }
}
