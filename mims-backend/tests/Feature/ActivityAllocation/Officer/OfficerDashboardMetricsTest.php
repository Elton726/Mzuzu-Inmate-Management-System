<?php

namespace Tests\Feature\ActivityAllocation\Officer;

use App\Models\Role;
use App\Models\User;
use App\Modules\Admissions\Models\Activity;
use App\Modules\Admissions\Models\Admission;
use App\Modules\Admissions\Models\Inmate;
use App\Modules\Admissions\Models\InmateActivity;
use App\Modules\ActivityAllocation\Models\ActivitySession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OfficerDashboardMetricsTest extends TestCase
{
    use RefreshDatabase;

    private function createOfficer(): User
    {
        $role = Role::firstOrCreate(['name' => 'officer_on_duty'], ['description' => null]);

        return User::factory()->create(['role_id' => $role->id]);
    }

    private function createActivity(array $overrides = []): Activity
    {
        return Activity::query()->create(array_merge([
            'name' => 'Workshop ' . uniqid(),
            'activity_type' => 'internal',
            'is_active' => true,
            'max_participants' => 20,
        ], $overrides));
    }

    public function test_officer_can_get_dashboard_metrics(): void
    {
        $officer = $this->createOfficer();
        $activity = $this->createActivity(['max_participants' => 10]);
        $today = now()->toDateString();

        ActivitySession::query()->create([
            'activity_id' => $activity->id,
            'session_date' => $today,
            'session_time' => 'Morning',
            'supervising_officer_id' => $officer->id,
            'status' => 'completed',
            'created_by' => $officer->id,
        ]);

        ActivitySession::query()->create([
            'activity_id' => $activity->id,
            'session_date' => $today,
            'session_time' => 'Afternoon',
            'supervising_officer_id' => $officer->id,
            'status' => 'scheduled',
            'created_by' => $officer->id,
        ]);

        $inmate = Inmate::query()->create([
            'prison_number' => 'PN-' . uniqid(),
            'first_name' => 'Test',
            'last_name' => 'Inmate',
            'date_of_birth' => '2000-01-01',
        ]);

        $admission = Admission::query()->create([
            'inmate_id' => $inmate->id,
            'admission_date' => $today,
            'admission_type' => 'first_time',
            'inmate_type' => 'convict',
            'case_number' => 'CASE-' . uniqid(),
            'sentence_years' => 2,
            'admitted_by' => $officer->id,
            'is_current' => true,
        ]);

        InmateActivity::query()->create([
            'inmate_id' => $inmate->id,
            'admission_id' => $admission->id,
            'activity_id' => $activity->id,
            'assigned_date' => $today,
            'assigned_by' => $officer->id,
        ]);

        $response = $this->actingAs($officer, 'sanctum')->getJson('/api/officer/dashboard/metrics');

        $response->assertOk()
            ->assertJsonPath('completion_rate.percent', 50)
            ->assertJsonPath('completion_rate.completed_sessions', 1)
            ->assertJsonPath('completion_rate.total_sessions', 2)
            ->assertJsonPath('participation.allocated', 1)
            ->assertJsonPath('participation.capacity', 10)
            ->assertJsonPath('participation.percent', 10);
    }
}
