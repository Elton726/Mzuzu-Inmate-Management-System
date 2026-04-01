<?php

require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== Database Schema Verification ===\n\n";

$tables = [
    'activity_categories',
    'external_activity_details',
    'officer_duty_rosters',
    'activity_assignment_logs'
];

foreach ($tables as $table) {
    $count = DB::table($table)->count();
    echo "Table '$table': " . ($count > 0 ? "EXISTS with $count records" : "EXISTS but empty") . "\n";
}

echo "\n=== Activities Table Extensions ===\n";
$activities = DB::table('activities')->select('id', 'name', 'source_type', 'security_level', 'category_id')->get();
foreach ($activities as $activity) {
    echo "Activity: {$activity->name} (Type: {$activity->source_type}, Level: {$activity->security_level})\n";
}

echo "\n=== Users Duty Eligibility ===\n";
$eligibleUsers = DB::table('users')->where('is_eligible_for_duty', true)->select('id', 'name')->get();
foreach ($eligibleUsers as $user) {
    echo "Eligible Officer: {$user->name} (ID: {$user->id})\n";
}

echo "\n=== Duty Roster ===\n";
$duties = DB::table('officer_duty_rosters')->join('users', 'officer_duty_rosters.officer_id', '=', 'users.id')->select('users.name', 'officer_duty_rosters.shift_type', 'officer_duty_rosters.duty_week_start')->get();
foreach ($duties as $duty) {
    echo "Duty: {$duty->name} - {$duty->shift_type} shift starting {$duty->duty_week_start}\n";
}

echo "\nVerification complete!\n";
