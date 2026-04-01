<?php

namespace App\Modules\ActivityAllocation\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class OfficerDutyRoster extends Model
{
    use HasFactory;

    public const SHIFT_TYPE_FULL_DAY = 'full_day';

    protected $table = 'officer_duty_rosters';

    protected $fillable = [
        'officer_id',
        'duty_week_start',
        'duty_week_end',
        'shift_type',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'duty_week_start' => 'date',
        'duty_week_end' => 'date',
        'is_active' => 'boolean',
    ];

    public function officer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'officer_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeCurrentWeek(Builder $query): Builder
    {
        $today = now()->toDateString();
        return $query->whereDate('duty_week_start', '<=', $today)
            ->whereDate('duty_week_end', '>=', $today);
    }

    public function isCurrent(): bool
    {
        return $this->duty_week_start <= now()
            && $this->duty_week_end >= now()
            && $this->is_active;
    }
}
