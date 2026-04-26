<?php

namespace App\Modules\Release\Events;

use App\Modules\Release\Models\SentenceAdjustment;

class SentenceAdjusted
{
    /**
     * @param  array<string, mixed>|null  $extraData
     */
    public function __construct(
        public SentenceAdjustment $adjustment,
        public ?int $userId = null,
        public ?string $ipAddress = null,
        public ?array $extraData = null,
    ) {}
}
