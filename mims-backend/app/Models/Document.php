<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Document extends Model
{
    use HasFactory;

    protected $fillable = [
        'inmate_id',
        'admission_id',
        'document_type',
        'file_name',
        'file_path',
        'mime_type',
        'uploaded_by',
        'description',
    ];

    public function inmate(): BelongsTo
    {
        return $this->belongsTo(Inmate::class);
    }

    public function admission(): BelongsTo
    {
        return $this->belongsTo(Admission::class);
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}

