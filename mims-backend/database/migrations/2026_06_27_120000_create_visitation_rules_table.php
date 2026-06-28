<?php

use App\Modules\Visitation\Models\VisitationRule;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('visitation_rules', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('value');
            $table->string('label');
            $table->string('type');
            $table->text('description')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        foreach (VisitationRule::DEFAULTS as $key => $definition) {
            VisitationRule::query()->create([
                'key' => $key,
                'value' => $definition['value'],
                'label' => $definition['label'],
                'type' => $definition['type'],
                'description' => $definition['description'],
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('visitation_rules');
    }
};
