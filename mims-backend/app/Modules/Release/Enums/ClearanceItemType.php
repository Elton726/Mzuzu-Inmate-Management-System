<?php

namespace App\Modules\Release\Enums;

enum ClearanceItemType: string
{
    case WARRANT_VERIFIED = 'warrant_verified';
    case NO_PENDING_COURT_ORDER = 'no_pending_court_order';
    case NO_DISCIPLINARY_CASE = 'no_disciplinary_case';
    case MEDICAL_CLEARANCE = 'medical_clearance';
    case PROPERTY_RETURNED = 'property_returned';
    case PROGRAM_EXIT_COMPLETED = 'program_exit_completed';
    case NEXT_OF_KIN_NOTIFIED = 'next_of_kin_notified';

    public function label(): string
    {
        return match ($this) {
            self::WARRANT_VERIFIED => 'Warrant Verified',
            self::NO_PENDING_COURT_ORDER => 'No Pending Court Order',
            self::NO_DISCIPLINARY_CASE => 'No Outstanding Disciplinary Case',
            self::MEDICAL_CLEARANCE => 'Medical Clearance',
            self::PROPERTY_RETURNED => 'Property Returned',
            self::PROGRAM_EXIT_COMPLETED => 'Activity/Program Exit Completed',
            self::NEXT_OF_KIN_NOTIFIED => 'Next-of-Kin Notified',
        };
    }

    public static function allLabels(): array
    {
        $labels = [];
        foreach (self::cases() as $case) {
            $labels[$case->value] = $case->label();
        }

        return $labels;
    }
}
