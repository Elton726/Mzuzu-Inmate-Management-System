<?php

namespace App\Modules\Visitation\Services;

use App\Modules\Admissions\Models\Inmate;
use App\Modules\Visitation\Models\VisitationRule;
use App\Modules\Visitation\Models\VisitSession;
use Illuminate\Validation\ValidationException;

class InmateVisitEligibilityChecker
{
    public function check(Inmate $inmate): array
    {
        if ($inmate->status !== 'active') {
            return [
                'eligible' => false,
                'reason' => 'Inmate profile is not active.',
            ];
        }

        if (! VisitationRule::boolValue('regular_visits_enabled')) {
            return [
                'eligible' => false,
                'reason' => 'Regular visits are currently disabled by visitation rules.',
            ];
        }

        $now = now();
        $currentTime = $now->format('H:i');
        $startTime = VisitationRule::valueFor('regular_visit_start_time') ?? '08:00';
        $endTime = VisitationRule::valueFor('regular_visit_end_time') ?? '17:00';

        if ($currentTime < $startTime || $currentTime > $endTime) {
            return [
                'eligible' => false,
                'reason' => "Regular visits are allowed between {$startTime} and {$endTime}.",
            ];
        }

        $dailyLimit = VisitationRule::intValue('max_regular_visits_per_inmate_per_day');
        $dailyVisits = VisitSession::query()
            ->where('inmate_id', $inmate->id)
            ->where('visit_type', 'regular')
            ->whereNotIn('status', ['cancelled', 'denied'])
            ->whereDate('created_at', $now->toDateString())
            ->count();

        if ($dailyVisits >= $dailyLimit) {
            return [
                'eligible' => false,
                'reason' => "This inmate has reached the daily limit of {$dailyLimit} regular visits.",
            ];
        }

        $weeklyLimit = VisitationRule::intValue('max_regular_visits_per_inmate_per_week');
        $weeklyVisits = VisitSession::query()
            ->where('inmate_id', $inmate->id)
            ->where('visit_type', 'regular')
            ->whereNotIn('status', ['cancelled', 'denied'])
            ->whereBetween('created_at', [$now->copy()->startOfWeek(), $now->copy()->endOfWeek()])
            ->count();

        if ($weeklyVisits >= $weeklyLimit) {
            return [
                'eligible' => false,
                'reason' => "This inmate has reached the weekly limit of {$weeklyLimit} regular visits.",
            ];
        }

        return ['eligible' => true, 'reason' => null];
    }

    public function ensureEligible(Inmate $inmate): void
    {
        $result = $this->check($inmate);

        if (!$result['eligible']) {
            throw ValidationException::withMessages([
                'inmate_id' => [$result['reason']],
            ]);
        }
    }
}
