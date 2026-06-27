<?php

namespace App\Modules\Visitation\Models;

use App\Modules\Visitation\Models\Concerns\UsesUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Visitor extends Model
{
    use UsesUuidPrimaryKey;

    protected $fillable = ['full_name', 'phone'];

    public function sessions(): HasMany
    {
        return $this->hasMany(VisitSession::class);
    }
}
