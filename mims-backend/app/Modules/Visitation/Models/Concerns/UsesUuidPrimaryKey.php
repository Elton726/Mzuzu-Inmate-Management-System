<?php

namespace App\Modules\Visitation\Models\Concerns;

use Illuminate\Support\Str;

trait UsesUuidPrimaryKey
{
    protected static function bootUsesUuidPrimaryKey(): void
    {
        static::creating(function ($model) {
            if (!$model->getKey()) {
                $model->{$model->getKeyName()} = (string) Str::uuid();
            }
        });
    }

    public function getIncrementing(): bool
    {
        return false;
    }

    public function getKeyType(): string
    {
        return 'string';
    }
}
