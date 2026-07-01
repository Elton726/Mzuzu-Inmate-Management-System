<?php

namespace App\Modules\Admissions\Services;

use Carbon\CarbonImmutable;

class SentenceCalculationService
{
    public function calculateProjectedReleaseDate(CarbonImmutable $sentenceStartDate, int $years, int $months = 0, int $days = 0): CarbonImmutable
    {
        $sentenceEndDate = $sentenceStartDate->addYears($years)->addMonths($months)->addDays($days);

        // Prototype rule: remission of 1/3 of total days.
        $totalDays = $sentenceStartDate->diffInDays($sentenceEndDate);
        $remissionDays = intdiv($totalDays, 3);

        return $sentenceEndDate->subDays($remissionDays);
    }
}
