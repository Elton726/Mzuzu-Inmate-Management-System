<?php

namespace App\Modules\Visitation\Models;

use App\Modules\Visitation\Models\Concerns\UsesUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VisitItem extends Model
{
    use UsesUuidPrimaryKey;

    protected $fillable = ['visit_session_id', 'item_description', 'status', 'notes'];

    public function session(): BelongsTo
    {
        return $this->belongsTo(VisitSession::class, 'visit_session_id');
    }

    public function flagReviews(): HasMany
    {
        return $this->hasMany(VisitItemFlagReview::class, 'visit_item_id');
    }
}
