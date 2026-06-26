<?php

namespace App\Modules\Release\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SentenceAdjustmentType extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'years_to_reduce',
        'info',
        'is_active',
    ];

    protected $casts = [
        'years_to_reduce' => 'integer',
        'is_active' => 'boolean',
    ];

    public static function activeNames(): array
    {
        return self::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->pluck('name')
            ->toArray();
    }

    public static function activeTypes()
    {
        return self::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get();
    }
}
