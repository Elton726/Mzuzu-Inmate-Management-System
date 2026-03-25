<?php

namespace App\Modules\Admissions\Services;

use App\Modules\Admissions\Models\Inmate;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class DuplicateDetectionService
{
    /**
     * @param  array{first_name:string,last_name:string,date_of_birth:string,national_id?:string|null}  $data
     */
    public function findPotentialDuplicates(array $data): Collection
    {
        $driver = DB::getDriverName();
        $firstLike = '%'.$data['first_name'].'%';
        $lastLike = '%'.$data['last_name'].'%';

        $query = Inmate::query()
            ->whereDate('date_of_birth', $data['date_of_birth'])
            ->where(function ($q) use ($driver, $firstLike, $lastLike) {
                if ($driver === 'pgsql') {
                    $q->where('first_name', 'ILIKE', $firstLike)
                        ->where('last_name', 'ILIKE', $lastLike);
                    return;
                }

                $q->whereRaw('LOWER(first_name) LIKE ?', [mb_strtolower($firstLike)])
                    ->whereRaw('LOWER(last_name) LIKE ?', [mb_strtolower($lastLike)]);
            });

        $matches = $query->limit(20)->get();

        if (!empty($data['national_id'])) {
            $matchesByNationalId = Inmate::query()
                ->where('national_id', $data['national_id'])
                ->limit(20)
                ->get();

            $matches = $matches->merge($matchesByNationalId)->unique('id')->values();
        }

        return $matches;
    }
}
