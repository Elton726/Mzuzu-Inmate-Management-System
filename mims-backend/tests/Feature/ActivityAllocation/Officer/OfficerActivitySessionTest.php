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

class OfficerActivitySessionTest extends TestCase
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
            'name' => 'Kitchen ' . uniqid(),
            'activity_type' => 'internal',
            'is_active' => true,
        ], $overrides));
    }

    public function test_officer_can_create_activity_session_and_update_status(): void
    {
        $officer = $this->createOfficer();
        $activity = $this->createActivity();

        $create = $this->actingAs($officer, 'sanctum')->postJson('/api/officer/activity-sessions', [
            'activity_id' => $activity->id,
            'session_date' => '2026-04-02',
            'session_time' => 'Morning',
            'supervising_officer_id' => $officer->id,
            'status' => 'scheduled',
        ]);

        $create->assertStatus(201)
            ->assertJsonFragment([
                'activity_id' => $activity->id,
                'supervising_officer_id' => $officer->id,
                'status' => 'scheduled',
            ]);

        $sessionId = $create->json('id');
        $this->assertDatabaseHas('activity_sessions', [
            'id' => $sessionId,
            'created_by' => $officer->id,
        ]);

        $update = $this->actingAs($officer, 'sanctum')->putJson("/api/officer/activity-sessions/{$sessionId}", [
            'status' => 'in_progress',
        ]);

        $update->assertStatus(200)
            ->assertJsonFragment([
                'id' => $sessionId,
                'status' => 'in_progress',
            ]);
    }

    public function test_officers_only_see_their_own_sessions(): void
    {
        $firstOfficer = $this->createOfficer();
        $secondOfficer = $this->createOfficer();
        $activity = $this->createActivity();

        $firstSession = ActivitySession::query()->create([
            'activity_id' => $activity->id,
            'session_date' => '2026-04-02',
            'session_time' => 'Morning',
            'supervising_officer_id' => $firstOfficer->id,
            'status' => 'scheduled',
            'created_by' => $firstOfficer->id,
        ]);

        $secondSession = ActivitySession::query()->create([
            'activity_id' => $activity->id,
            'session_date' => '2026-04-03',
            'session_time' => 'Afternoon',
            'supervising_officer_id' => $secondOfficer->id,
            'status' => 'scheduled',
            'created_by' => $secondOfficer->id,
        ]);

        $firstList = $this->actingAs($firstOfficer, 'sanctum')->getJson('/api/officer/activity-sessions');
        $firstList->assertStatus(200);
        $firstIds = collect($firstList->json('data'))->pluck('id')->all();
        $this->assertContains($firstSession->id, $firstIds);
        $this->assertNotContains($secondSession->id, $firstIds);

        $secondList = $this->actingAs($secondOfficer, 'sanctum')->getJson('/api/officer/activity-sessions');
        $secondList->assertStatus(200);
        $secondIds = collect($secondList->json('data'))->pluck('id')->all();
        $this->assertContains($secondSession->id, $secondIds);
        $this->assertNotContains($firstSession->id, $secondIds);

        $this->actingAs($firstOfficer, 'sanctum')
            ->getJson("/api/officer/activity-sessions/{$secondSession->id}")
            ->assertStatus(404);
    }

    public function test_daily_sessions_are_created_per_officer(): void
    {
        $firstOfficer = $this->createOfficer();
        $secondOfficer = $this->createOfficer();
        $activity = $this->createActivity(['activity_type' => 'internal']);

        $first = $this->actingAs($firstOfficer, 'sanctum')->postJson('/api/officer/activity-sessions/daily', [
            'activity_id' => $activity->id,
            'session_date' => '2026-04-03',
        ]);
        $first->assertStatus(201);

        $second = $this->actingAs($secondOfficer, 'sanctum')->postJson('/api/officer/activity-sessions/daily', [
            'activity_id' => $activity->id,
            'session_date' => '2026-04-03',
        ]);
        $second->assertStatus(201);

        $this->assertNotSame($first->json('id'), $second->json('id'));
    }

    public function test_officer_cannot_edit_session_fields_other_than_status(): void
    {
        $officer = $this->createOfficer();
        $activity = $this->createActivity();

        $session = ActivitySession::query()->create([
            'activity_id' => $activity->id,
            'session_date' => '2026-04-02',
            'session_time' => 'Morning',
            'supervising_officer_id' => $officer->id,
            'status' => 'scheduled',
            'created_by' => $officer->id,
        ]);

        $update = $this->actingAs($officer, 'sanctum')->putJson("/api/officer/activity-sessions/{$session->id}", [
            'status' => 'in_progress',
            'session_time' => 'Afternoon',
        ]);

        $update->assertStatus(422)->assertJsonFragment([
            'error' => 'Only the session status can be changed after creation.',
        ]);

        $session->refresh();
        $this->assertSame('Morning', $session->session_time);
        $this->assertSame('scheduled', $session->status);
    }

    public function test_officer_can_record_attendance_and_view_summary_and_report(): void
    {
        $officer = $this->createOfficer();
        $activity = $this->createActivity();

        $session = ActivitySession::query()->create([
            'activity_id' => $activity->id,
            'session_date' => '2026-04-02',
            'session_time' => 'Morning',
            'supervising_officer_id' => $officer->id,
            'status' => 'scheduled',
            'created_by' => $officer->id,
        ]);

        $inmate = Inmate::query()->create([
            'prison_number' => 'PN-' . uniqid(),
            'first_name' => 'John',
            'last_name' => 'Doe',
            'date_of_birth' => '2000-01-01',
        ]);

        $admission = Admission::query()->create([
            'inmate_id' => $inmate->id,
            'admission_date' => '2026-04-02',
            'admission_type' => 'first_time',
            'inmate_type' => 'convict',
            'case_number' => 'CASE-' . uniqid(),
            'admitted_by' => $officer->id,
            'is_current' => true,
        ]);

        InmateActivity::query()->create([
            'inmate_id' => $inmate->id,
            'admission_id' => $admission->id,
            'activity_id' => $activity->id,
            'assigned_date' => '2026-04-02',
            'assigned_by' => $officer->id,
        ]);

        $record = $this->actingAs($officer, 'sanctum')->postJson("/api/officer/activity-sessions/{$session->id}/attendance", [
            'attendances' => [
                [
                    'inmate_id' => $inmate->id,
                    'admission_id' => $admission->id,
                    'attendance_status' => 'present',
                    'notes' => 'Arrived early',
                ],
            ],
        ]);

        $record->assertStatus(201)
            ->assertJsonFragment([
                'inmate_id' => $inmate->id,
                'attendance_status' => 'present',
            ]);

        $this->assertDatabaseHas('session_attendance', [
            'session_id' => $session->id,
            'inmate_id' => $inmate->id,
            'admission_id' => $admission->id,
            'attendance_status' => 'present',
            'recorded_by' => $officer->id,
        ]);

        $summary = $this->actingAs($officer, 'sanctum')->getJson("/api/officer/activity-sessions/{$session->id}/attendance/summary");
        $summary->assertStatus(200)->assertJsonFragment([
            'total_present' => 1,
            'total_recorded' => 1,
        ]);

        $report = $this->actingAs($officer, 'sanctum')->getJson("/api/officer/activity-sessions/{$session->id}/attendance/report");
        $report->assertStatus(200)->assertJsonFragment([
            'inmate_id' => $inmate->id,
            'attendance_status' => 'present',
        ]);
    }

    public function test_officer_cannot_delete_session_with_recorded_attendance(): void
    {
        $officer = $this->createOfficer();
        $activity = $this->createActivity();

        $session = ActivitySession::query()->create([
            'activity_id' => $activity->id,
            'session_date' => '2026-04-02',
            'session_time' => 'Morning',
            'supervising_officer_id' => $officer->id,
            'status' => 'scheduled',
            'created_by' => $officer->id,
        ]);

        $inmate = Inmate::query()->create([
            'prison_number' => 'PN-' . uniqid(),
            'first_name' => 'Jane',
            'last_name' => 'Roe',
            'date_of_birth' => '2001-01-01',
        ]);

        $admission = Admission::query()->create([
            'inmate_id' => $inmate->id,
            'admission_date' => '2026-04-02',
            'admission_type' => 'first_time',
            'inmate_type' => 'convict',
            'case_number' => 'CASE-' . uniqid(),
            'admitted_by' => $officer->id,
            'is_current' => true,
        ]);

        InmateActivity::query()->create([
            'inmate_id' => $inmate->id,
            'admission_id' => $admission->id,
            'activity_id' => $activity->id,
            'assigned_date' => '2026-04-02',
            'assigned_by' => $officer->id,
        ]);

        $this->actingAs($officer, 'sanctum')->postJson("/api/officer/activity-sessions/{$session->id}/attendance", [
            'attendances' => [
                [
                    'inmate_id' => $inmate->id,
                    'admission_id' => $admission->id,
                    'attendance_status' => 'present',
                ],
            ],
        ])->assertStatus(201);

        $delete = $this->actingAs($officer, 'sanctum')->deleteJson("/api/officer/activity-sessions/{$session->id}");
        $delete->assertStatus(422)->assertJsonFragment([
            'error' => 'Cannot delete session with recorded attendance',
        ]);
    }

    public function test_officer_can_list_available_activities(): void
    {
        $officer = $this->createOfficer();
        $active = $this->createActivity(['name' => 'Active ' . uniqid(), 'is_active' => true]);
        $this->createActivity(['name' => 'Inactive ' . uniqid(), 'is_active' => false]);

        $res = $this->actingAs($officer, 'sanctum')->getJson('/api/officer/activities/available?per_page=50');
        $res->assertStatus(200);

        $ids = collect($res->json('data'))->pluck('id')->all();
        $this->assertContains($active->id, $ids);
        $this->assertCount(1, $ids);
    }

    public function test_officer_can_create_or_fetch_daily_session_for_internal_activity(): void
    {
        $officer = $this->createOfficer();
        $activity = $this->createActivity(['activity_type' => 'internal']);

        $first = $this->actingAs($officer, 'sanctum')->postJson('/api/officer/activity-sessions/daily', [
            'activity_id' => $activity->id,
            'session_date' => '2026-04-03',
        ]);

        $first->assertStatus(201)->assertJsonFragment([
            'activity_id' => $activity->id,
            'supervising_officer_id' => $officer->id,
        ]);

        $firstId = $first->json('id');
        $session = ActivitySession::query()->findOrFail($firstId);
        $this->assertSame($activity->id, (int) $session->activity_id);
        $this->assertSame('2026-04-03', $session->session_date->toDateString());
        $this->assertSame($officer->id, (int) $session->created_by);

        $second = $this->actingAs($officer, 'sanctum')->postJson('/api/officer/activity-sessions/daily', [
            'activity_id' => $activity->id,
            'session_date' => '2026-04-03',
        ]);

        $second->assertStatus(200)->assertJsonFragment([
            'id' => $firstId,
            'activity_id' => $activity->id,
        ]);
    }

    public function test_daily_session_endpoint_rejects_external_activities(): void
    {
        $officer = $this->createOfficer();
        $activity = $this->createActivity(['activity_type' => 'external']);

        $res = $this->actingAs($officer, 'sanctum')->postJson('/api/officer/activity-sessions/daily', [
            'activity_id' => $activity->id,
            'session_date' => '2026-04-03',
        ]);

        $res->assertStatus(422)->assertJsonFragment([
            'error' => 'Daily tracking is only supported for internal activities.',
        ]);
    }

    public function test_officer_can_create_or_fetch_one_time_session_for_external_activity(): void
    {
        $officer = $this->createOfficer();
        $activity = $this->createActivity(['activity_type' => 'external']);

        $first = $this->actingAs($officer, 'sanctum')->postJson('/api/officer/activity-sessions/external-once', [
            'activity_id' => $activity->id,
            'session_date' => '2026-04-03',
        ]);

        $first->assertStatus(201)->assertJsonFragment([
            'activity_id' => $activity->id,
            'supervising_officer_id' => $officer->id,
        ]);

        $firstId = $first->json('id');
        $this->assertNotNull($firstId);

        $second = $this->actingAs($officer, 'sanctum')->postJson('/api/officer/activity-sessions/external-once', [
            'activity_id' => $activity->id,
            'session_date' => '2026-04-03',
        ]);

        $second->assertStatus(200)->assertJsonFragment([
            'id' => $firstId,
            'activity_id' => $activity->id,
        ]);
    }
}
