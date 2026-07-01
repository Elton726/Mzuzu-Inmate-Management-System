<?php

namespace App\Modules\Visitation\Services;

use App\Modules\Visitation\Models\CharityBooking;
use App\Modules\Visitation\Models\VisitSession;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

class VisitSlotChecker
{
    public function hasConflict(int $inmateId, string $date, string $time, int $durationMinutes = 60, ?string $ignoreBookingId = null): bool
    {
        $start = Carbon::parse($date . ' ' . $time);
        $end = (clone $start)->addMinutes($durationMinutes);

        $sessionConflict = VisitSession::query()
            ->where('inmate_id', $inmateId)
            ->whereIn('status', ['checked_in', 'in_progress'])
            ->whereDate('checked_in_at', $start->toDateString())
            ->where(function ($query) use ($start, $end) {
                $query->whereBetween('checked_in_at', [$start, $end])
                    ->orWhere(function ($nested) use ($start) {
                        $nested->where('checked_in_at', '<=', $start)
                            ->whereNull('checked_out_at');
                    })
                    ->orWhere(function ($nested) use ($start) {
                        $nested->where('checked_in_at', '<=', $start)
                            ->where('checked_out_at', '>', $start);
                    });
            })
            ->exists();

        if ($sessionConflict) {
            return true;
        }

        return CharityBooking::query()
            ->where('inmate_id', $inmateId)
            ->whereIn('status', ['pending', 'approved'])
            ->when($ignoreBookingId, fn ($query) => $query->where('id', '<>', $ignoreBookingId))
            ->whereDate('proposed_date', $start->toDateString())
            ->get()
            ->contains(function (CharityBooking $booking) use ($start, $end) {
                $bookingStart = Carbon::parse($booking->proposed_date->toDateString() . ' ' . $booking->proposed_time);
                $bookingEnd = (clone $bookingStart)->addMinutes((int) $booking->duration_minutes);

                return $start->lt($bookingEnd) && $end->gt($bookingStart);
            });
    }

    public function ensureAvailable(int $inmateId, string $date, string $time, int $durationMinutes = 60): void
    {
        if ($this->hasConflict($inmateId, $date, $time, $durationMinutes)) {
            throw ValidationException::withMessages([
                'slot' => ['Selected visit slot conflicts with another visit for this inmate.'],
            ]);
        }
    }
}
