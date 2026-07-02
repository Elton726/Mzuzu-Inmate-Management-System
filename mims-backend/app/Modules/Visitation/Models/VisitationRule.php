<?php

namespace App\Modules\Visitation\Models;

use Illuminate\Database\Eloquent\Model;

class VisitationRule extends Model
{
    public const DEFAULTS = [
        'regular_visits_enabled' => [
            'value' => '1',
            'label' => 'Regular visits enabled',
            'type' => 'boolean',
            'description' => 'Allow gatekeepers to check in regular visits.',
        ],
        'regular_visit_start_time' => [
            'value' => '08:00',
            'label' => 'Regular visit start time',
            'type' => 'time',
            'description' => 'Earliest time regular visits may start.',
        ],
        'regular_visit_end_time' => [
            'value' => '17:00',
            'label' => 'Regular visit end time',
            'type' => 'time',
            'description' => 'Latest time regular visits may start.',
        ],
        'max_regular_visits_per_inmate_per_day' => [
            'value' => '2',
            'label' => 'Max regular visits per inmate per day',
            'type' => 'integer',
            'description' => 'Maximum regular visit sessions allowed for one inmate in a day.',
        ],
        'max_regular_visits_per_inmate_per_week' => [
            'value' => '5',
            'label' => 'Max regular visits per inmate per week',
            'type' => 'integer',
            'description' => 'Maximum regular visit sessions allowed for one inmate in a calendar week.',
        ],
        'regular_visit_duration' => [
            'value' => '60',
            'label' => 'Regular visit duration (minutes)',
            'type' => 'integer',
            'description' => 'Allocated time in minutes for a regular visit session.',
        ],
    ];

    protected $fillable = [
        'key',
        'value',
        'label',
        'type',
        'description',
        'updated_by',
    ];

    public static function valueFor(string $key): ?string
    {
        $default = self::DEFAULTS[$key]['value'] ?? null;

        return self::query()->where('key', $key)->value('value') ?? $default;
    }

    public static function intValue(string $key): int
    {
        return (int) self::valueFor($key);
    }

    public static function boolValue(string $key): bool
    {
        return in_array(self::valueFor($key), ['1', 'true', 'yes', 'on'], true);
    }
}
