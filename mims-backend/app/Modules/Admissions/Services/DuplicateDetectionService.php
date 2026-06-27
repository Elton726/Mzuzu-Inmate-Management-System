<?php

namespace App\Modules\Admissions\Services;

use App\Modules\Admissions\Models\Inmate;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class DuplicateDetectionService
{
    /**
     * @param  array{first_name:string,last_name:string,date_of_birth:string,national_id?:string|null,nationality?:string|null,gender?:string|null,next_of_kin_name?:string|null,next_of_kin_contact?:string|null}  $data
     */
    public function findPotentialDuplicates(array $data): Collection
    {
        $driver = DB::getDriverName();
        $firstLike = '%'.$data['first_name'].'%';
        $lastLike = '%'.$data['last_name'].'%';

        $query = Inmate::query()
            ->where(function ($q) use ($driver, $data, $firstLike, $lastLike) {
                // 1. Same Date of Birth
                $q->whereDate('date_of_birth', $data['date_of_birth']);

                // 2. Same National ID (if provided)
                if (!empty($data['national_id'])) {
                    $q->orWhere('national_id', $data['national_id']);
                }

                // 3. Name similarity (both match)
                $q->orWhere(function ($nameQ) use ($driver, $firstLike, $lastLike) {
                    if ($driver === 'pgsql') {
                        $nameQ->where('first_name', 'ILIKE', $firstLike)
                              ->where('last_name', 'ILIKE', $lastLike);
                    } else {
                        $nameQ->whereRaw('LOWER(first_name) LIKE ?', [mb_strtolower($firstLike)])
                              ->whereRaw('LOWER(last_name) LIKE ?', [mb_strtolower($lastLike)]);
                    }
                });
            });

        $candidates = $query->limit(50)->get();

        $scoredCandidates = $candidates->map(function ($inmate) use ($data) {
            $inmate->similarity_score = $this->calculateSimilarityScore($inmate, $data);
            return $inmate;
        });

        return $scoredCandidates->sortByDesc('similarity_score')->values();
    }

    private function calculateSimilarityScore(Inmate $inmate, array $data): int
    {
        // 1. National ID check: if matching exactly, it's 100% similarity
        if (!empty($data['national_id']) && !empty($inmate->national_id)) {
            if (strcasecmp(trim($data['national_id']), trim($inmate->national_id)) === 0) {
                return 100;
            }
        }

        $points = 0;

        // 2. First Name (Max 25 points)
        $inputFirst = trim($data['first_name']);
        $dbFirst = trim($inmate->first_name);
        if (strcasecmp($inputFirst, $dbFirst) === 0) {
            $points += 25;
        } elseif (
            stripos($dbFirst, $inputFirst) !== false ||
            stripos($inputFirst, $dbFirst) !== false
        ) {
            $points += 15;
        }

        // 3. Last Name (Max 25 points)
        $inputLast = trim($data['last_name']);
        $dbLast = trim($inmate->last_name);
        if (strcasecmp($inputLast, $dbLast) === 0) {
            $points += 25;
        } elseif (
            stripos($dbLast, $inputLast) !== false ||
            stripos($inputLast, $dbLast) !== false
        ) {
            $points += 15;
        }

        // 4. Date of Birth (Max 30 points)
        if (!empty($data['date_of_birth']) && !empty($inmate->date_of_birth)) {
            $inputDob = is_string($data['date_of_birth']) ? new \DateTime($data['date_of_birth']) : $data['date_of_birth'];
            $dbDob = $inmate->date_of_birth instanceof \DateTime ? $inmate->date_of_birth : new \DateTime($inmate->date_of_birth);

            if ($inputDob->format('Y-m-d') === $dbDob->format('Y-m-d')) {
                $points += 30;
            } elseif ($inputDob->format('Y-m') === $dbDob->format('Y-m')) {
                $points += 15;
            } elseif ($inputDob->format('Y') === $dbDob->format('Y')) {
                $points += 5;
            }
        }

        // 5. Nationality (Max 10 points)
        if (!empty($data['nationality']) && !empty($inmate->nationality)) {
            if (strcasecmp(trim($data['nationality']), trim($inmate->nationality)) === 0) {
                $points += 10;
            }
        }

        // 6. Gender (Max 5 points)
        if (!empty($data['gender']) && !empty($inmate->gender)) {
            if (strcasecmp(trim($data['gender']), trim($inmate->gender)) === 0) {
                $points += 5;
            }
        }

        // 7. Next of Kin Name (Max 5 points)
        if (!empty($data['next_of_kin_name']) && !empty($inmate->next_of_kin_name)) {
            $inputNok = trim($data['next_of_kin_name']);
            $dbNok = trim($inmate->next_of_kin_name);
            if (strcasecmp($inputNok, $dbNok) === 0) {
                $points += 5;
            } elseif (
                stripos($dbNok, $inputNok) !== false ||
                stripos($inputNok, $dbNok) !== false
            ) {
                $points += 3;
            }
        }

        return min($points, 100);
    }
}
