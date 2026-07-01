<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sentence_adjustment_types', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->integer('years_to_reduce')->default(0);
            $table->text('info')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        DB::table('sentence_adjustment_types')->insert([
            [
                'name' => 'remission',
                'years_to_reduce' => 0,
                'info' => 'Sentence remission type for early release adjustments',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'pardon',
                'years_to_reduce' => 0,
                'info' => 'Presidential or executive pardon adjustment',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'reduction',
                'years_to_reduce' => 0,
                'info' => 'Court-approved sentence reduction',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'good_behaviour',
                'years_to_reduce' => 0,
                'info' => 'Reduction for consistent good behaviour',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('sentence_adjustment_types');
    }
};
