<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('activity_rotation_queues')) {
            Schema::create('activity_rotation_queues', function (Blueprint $table) {
                $table->id();
                $table->foreignId('activity_id')->constrained('activities')->onDelete('cascade');
                $table->foreignId('inmate_id')->constrained('inmates')->onDelete('cascade');
                $table->foreignId('admission_id')->constrained('admissions')->onDelete('cascade');
                $table->integer('queue_position');
                $table->integer('cycle_number')->default(1);
                $table->timestamp('served_at')->nullable();
                $table->timestamps();

                $table->unique(['activity_id', 'inmate_id', 'cycle_number'], 'idx_rotation_unique');
                $table->index(['activity_id', 'cycle_number', 'served_at'], 'idx_rotation_lookup');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_rotation_queues');
    }
};
