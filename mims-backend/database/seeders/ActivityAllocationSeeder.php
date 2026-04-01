<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ActivityAllocationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $createdById = DB::table('users')->orderBy('id')->value('id');
        $categoryIdsByName = [];
        if (Schema::hasTable('activity_categories')) {
            $categoryIdsByName = DB::table('activity_categories')->pluck('id', 'name')->all();
        }

        // Insert predefined internal activities
        $activities = [
            [
                'name' => 'Kitchen',
                'activity_type' => 'internal',
                'source_type' => 'predefined',
                'eligibility_criteria' => '{"allowed_inmate_types": ["convict"], "min_sentence_years": 0, "skills_required": ["cooking", "cleaning"]}',
                'max_participants' => 15,
                'is_active' => true,
                'security_level' => 'low',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Tailoring',
                'activity_type' => 'internal',
                'source_type' => 'predefined',
                'eligibility_criteria' => '{"allowed_inmate_types": ["convict"], "min_sentence_years": 1, "skills_required": ["sewing", "design"]}',
                'max_participants' => 10,
                'is_active' => true,
                'security_level' => 'medium',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Carpentry',
                'activity_type' => 'internal',
                'source_type' => 'predefined',
                'eligibility_criteria' => '{"allowed_inmate_types": ["convict"], "min_sentence_years": 2, "skills_required": ["woodworking"]}',
                'max_participants' => 8,
                'is_active' => true,
                'security_level' => 'medium',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Farm Work',
                'activity_type' => 'internal',
                'source_type' => 'predefined',
                'eligibility_criteria' => '{"allowed_inmate_types": ["convict"], "min_sentence_years": 0, "skills_required": ["farming"]}',
                'max_participants' => 20,
                'is_active' => true,
                'security_level' => 'low',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Computer Literacy',
                'activity_type' => 'internal',
                'source_type' => 'custom',
                'eligibility_criteria' => '{"allowed_inmate_types": ["convict"], "min_sentence_years": 3, "education_level": "secondary"}',
                'max_participants' => 5,
                'is_active' => true,
                'security_level' => 'low',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Community Cleanup',
                'activity_type' => 'external',
                'source_type' => 'custom',
                'eligibility_criteria' => '{"allowed_inmate_types": ["convict"], "min_sentence_years": 0, "good_behavior": true}',
                'max_participants' => 20,
                'is_active' => true,
                'security_level' => 'high',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        foreach ($activities as $activity) {
            if ($createdById) {
                $activity['created_by'] = (int) $createdById;
            }

            if ($categoryIdsByName) {
                $categoryName = match (true) {
                    $activity['activity_type'] === 'internal' && $activity['source_type'] === 'predefined' => 'Internal Predefined',
                    $activity['activity_type'] === 'internal' && $activity['source_type'] === 'custom' => 'Internal Custom',
                    $activity['activity_type'] === 'external' => 'External',
                    default => null,
                };

                if ($categoryName && isset($categoryIdsByName[$categoryName])) {
                    $activity['category_id'] = (int) $categoryIdsByName[$categoryName];
                }
            }

            // Make seeding idempotent: "activities.name" is unique.
            $existingActivityId = DB::table('activities')
                ->where('name', $activity['name'])
                ->value('id');

            if ($existingActivityId) {
                $activityId = (int) $existingActivityId;

                // Avoid overwriting created_at on re-seed.
                $update = $activity;
                unset($update['created_at']);
                $update['updated_at'] = now();

                DB::table('activities')
                    ->where('id', $activityId)
                    ->update($update);
            } else {
                $activityId = DB::table('activities')->insertGetId($activity);
            }

            // If it's an external activity, add details
            if ($activity['activity_type'] === 'external' && $activity['name'] === 'Community Cleanup') {
                $externalDetails = [
                    'activity_id' => $activityId,
                    'location' => 'Mzuzu City Center',
                    'external_partner' => 'Mzuzu City Council',
                    'requires_transport' => true,
                    'transport_details' => 'Prison truck will transport inmates at 7:00 AM',
                    'safety_requirements' => 'Inmates must remain in designated area; two officers required',
                    'supervisor_requirements' => 'One officer per 5 inmates; must have first aid training',
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                $existingExternalId = DB::table('external_activity_details')
                    ->where('activity_id', $activityId)
                    ->value('id');

                if ($existingExternalId) {
                    $update = $externalDetails;
                    unset($update['created_at']);
                    $update['updated_at'] = now();

                    DB::table('external_activity_details')
                        ->where('id', $existingExternalId)
                        ->update($update);
                } else {
                    DB::table('external_activity_details')->insert($externalDetails);
                }
            }
        }

        // Sample officer duty roster (assuming some user IDs exist)
        // Note: Adjust user IDs based on your actual data
        $dutyRosters = [
            [
                'officer_id' => 2, // Adjust based on actual officer user IDs
                'duty_week_start' => '2026-03-30',
                'duty_week_end' => '2026-04-05',
                'shift_type' => 'full_day',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        // Make seeding idempotent; avoid inserting the same roster entries repeatedly.
        foreach ($dutyRosters as $roster) {
            // officer_duty_rosters.created_by is NOT nullable; skip roster seeding if no users exist.
            if (! $createdById) {
                continue;
            }
            $roster['created_by'] = (int) $createdById;

            $officerExists = DB::table('users')->where('id', $roster['officer_id'])->exists();
            if (! $officerExists) {
                continue;
            }

            $key = [
                'officer_id' => $roster['officer_id'],
                'duty_week_start' => $roster['duty_week_start'],
                'duty_week_end' => $roster['duty_week_end'],
                'shift_type' => $roster['shift_type'],
            ];

            $existingRosterId = DB::table('officer_duty_rosters')
                ->where($key)
                ->value('id');

            if ($existingRosterId) {
                $update = $roster;
                unset($update['created_at']);
                $update['updated_at'] = now();

                DB::table('officer_duty_rosters')
                    ->where('id', $existingRosterId)
                    ->update($update);
            } else {
                DB::table('officer_duty_rosters')->insert($roster);
            }
        }

        // Mark some users as eligible for duty
        DB::table('users')
            ->whereIn('id', [2, 3, 4]) // Adjust based on actual officer user IDs
            ->update(['is_eligible_for_duty' => true]);
    }
}
