<?php
// database/migrations/2026_01_01_000009_create_documents_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inmate_id')->constrained('inmates')->cascadeOnDelete();
            $table->foreignId('admission_id')->nullable()->constrained('admissions')->cascadeOnDelete();
            $table->string('document_type', 50);
            $table->string('file_name', 255);
            $table->string('file_path', 255);
            $table->string('mime_type', 100)->nullable();
            $table->foreignId('uploaded_by')->constrained('users')->restrictOnDelete();
            $table->text('description')->nullable();
            $table->timestamps();

            // Indexes
            $table->index(['inmate_id', 'document_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
