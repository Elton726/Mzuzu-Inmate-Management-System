<?php

namespace App\Modules\Visitation\Services;

use App\Modules\Admissions\Models\Inmate;
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
