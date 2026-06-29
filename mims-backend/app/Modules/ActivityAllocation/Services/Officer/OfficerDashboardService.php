<?php

namespace App\Modules\ActivityAllocation\Services\Officer;

use App\Modules\ActivityAllocation\Models\ActivitySession;
use App\Modules\Admissions\Models\Activity;
use App\Modules\Admissions\Models\InmateActivity;
use Illuminate\Support\Collection;

class OfficerDashboardService
{
    public function getMetrics(int $officerId): array
    {
        $today = now()->toDateString();

        $todaySessions = ActivitySession::query()
            ->where('supervising_officer_id', $officerId)
            ->whereDate('session_date', $today)
            ->where('status', '!=', 'cancelled')
            ->get();

        $expectedActivities = Activity::query()
            ->where('is_active', true)
            ->count();

        $totalSessions = max($expectedActivities, $todaySessions->count());
        $completedSessions = $todaySessions->where('status', 'completed')->count();
        $completionPercent = $totalSessions > 0
            ? (int) round(($completedSessions / $totalSessions) * 100)
            : 0;

        $activityIds = $this->resolveParticipationActivityIds($officerId, $todaySessions);

        $allocatedToday = InmateActivity::query()
            ->whereDate('assigned_date', $today)
            ->whereIn('activity_id', $activityIds)
            ->whereNull('end_date')
            ->distinct()
            ->count('inmate_id');

        $capacityTotal = (int) Activity::query()
            ->whereIn('id', $activityIds)
            ->whereNotNull('max_participants')
            ->sum('max_participants');

        $participationPercent = $capacityTotal > 0
            ? min(100, (int) round(($allocatedToday / $capacityTotal) * 100))
            : 0;

        return [
            'completion_rate' => [
                'percent' => $completionPercent,
                'completed_sessions' => $completedSessions,
                'total_sessions' => $totalSessions,
            ],
            'participation' => [
                'allocated' => $allocatedToday,
                'capacity' => $capacityTotal,
                'percent' => $participationPercent,
            ],
        ];
    }

    private function resolveParticipationActivityIds(int $officerId, Collection $todaySessions): Collection
    {
        $activityIds = $todaySessions->pluck('activity_id')->unique()->filter()->values();

        if ($activityIds->isNotEmpty()) {
            return $activityIds;
        }

        return ActivitySession::query()
            ->where('supervising_officer_id', $officerId)
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->pluck('activity_id')
            ->unique()
            ->filter()
            ->values();
    }
}
