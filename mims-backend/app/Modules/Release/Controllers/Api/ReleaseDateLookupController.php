<?php

namespace App\Modules\Release\Controllers\Api;

use App\Http\Controllers\Controller;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReleaseDateLookupController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
            'q' => ['nullable', 'string', 'min:2'],
            'inmate_type' => ['nullable', 'string', 'in:convict,remandee,murder_remandee'],
            'release_status' => ['nullable', 'string', 'in:upcoming,due_today,overdue,no_date,released'],
        ]);

        $perPage = $validated['per_page'] ?? 25;
        $page = $validated['page'] ?? 1;
        $query = $validated['q'] ?? null;
        $inmateType = $validated['inmate_type'] ?? null;
        $releaseStatus = $validated['release_status'] ?? null;
        $today = CarbonImmutable::today()->toDateString();

        $releaseDates = DB::table('admissions as a')
            ->join('inmates as i', 'i.id', '=', 'a.inmate_id')
            ->select([
                'i.id as inmate_id',
                'a.id as admission_id',
                'i.prison_number',
                'i.first_name',
                'i.last_name',
                'i.status as inmate_status',
                'a.inmate_type',
                'a.case_number',
                'a.sentence_years',
                'a.sentence_months',
                'a.sentence_start_date',
                'a.projected_release_date',
                'a.released_at',
                'a.release_reason',
            ])
            ->where('a.is_current', true);

        if ($query) {
            $releaseDates->where(function ($q) use ($query) {
                $q->where('i.first_name', 'like', "%{$query}%")
                    ->orWhere('i.last_name', 'like', "%{$query}%")
                    ->orWhere('i.prison_number', 'like', "%{$query}%")
                    ->orWhere('a.case_number', 'like', "%{$query}%");
            });
        }

        if ($inmateType) {
            $releaseDates->where('a.inmate_type', $inmateType);
        }

        match ($releaseStatus) {
            'released' => $releaseDates->whereNotNull('a.released_at'),
            'no_date' => $releaseDates->whereNull('a.projected_release_date')->whereNull('a.released_at'),
            'overdue' => $releaseDates->whereNull('a.released_at')->whereDate('a.projected_release_date', '<', $today),
            'due_today' => $releaseDates->whereNull('a.released_at')->whereDate('a.projected_release_date', '=', $today),
            'upcoming' => $releaseDates->whereNull('a.released_at')->whereDate('a.projected_release_date', '>', $today),
            default => null,
        };

        $paginated = $releaseDates
            ->orderByRaw('a.projected_release_date IS NULL')
            ->orderBy('a.projected_release_date')
            ->orderBy('i.prison_number')
            ->paginate($perPage, ['*'], 'page', $page);

        $paginated->getCollection()->transform(function ($record) use ($today) {
            $record->inmate_name = trim($record->first_name . ' ' . $record->last_name);
            $record->days_remaining = $this->daysRemaining($record->projected_release_date);
            $record->release_status = $this->releaseStatus($record->projected_release_date, $record->released_at, $today);

            unset($record->first_name, $record->last_name);

            return $record;
        });

        return response()->json($paginated);
    }

    private function daysRemaining(?string $releaseDate): ?int
    {
        if (!$releaseDate) {
            return null;
        }

        return CarbonImmutable::today()->diffInDays(CarbonImmutable::parse($releaseDate), false);
    }

    private function releaseStatus(?string $releaseDate, ?string $releasedAt, string $today): string
    {
        if ($releasedAt) {
            return 'released';
        }

        if (!$releaseDate) {
            return 'no_date';
        }

        if ($releaseDate < $today) {
            return 'overdue';
        }

        if ($releaseDate === $today) {
            return 'due_today';
        }

        return 'upcoming';
    }
}
