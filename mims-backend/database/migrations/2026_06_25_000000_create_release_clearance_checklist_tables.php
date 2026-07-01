<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('release_clearance_checklists')) {
            Schema::create('release_clearance_checklists', function (Blueprint $table) {
                $table->id();
                $table->foreignId('release_workflow_id')->nullable()->constrained('release_workflow')->nullOnDelete();
                $table->foreignId('admission_id')->constrained()->onDelete('cascade');
                $table->foreignId('initiated_by')->constrained('users')->onDelete('restrict');
                $table->timestamp('initiated_at')->useCurrent();
                $table->foreignId('completed_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('completed_at')->nullable();
                $table->boolean('all_items_cleared')->default(false);
                $table->timestamps(0);
                $table->index('release_workflow_id');
                $table->index('admission_id');
                $table->index('all_items_cleared');
            });
        }

        if (!Schema::hasTable('release_clearance_checklist_items')) {
            Schema::create('release_clearance_checklist_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('clearance_checklist_id')->constrained('release_clearance_checklists')->onDelete('cascade');
                $table->string('item_type', 50);
                $table->string('item_label', 100);
                $table->boolean('is_cleared')->default(false);
                $table->foreignId('cleared_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('cleared_at')->nullable();
                $table->text('verification_notes')->nullable();
                $table->timestamps(0);
                $table->index('clearance_checklist_id');
                $table->index('item_type');
                $table->index('is_cleared');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('release_clearance_checklist_items');
        Schema::dropIfExists('release_clearance_checklists');
    }
};
