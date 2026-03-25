<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $adminRole = Role::where('name', 'admin')->first()
            ?? Role::create(['name' => 'admin', 'description' => 'System administrator']);

        User::updateOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Administrator',
                'password' => Hash::make('Admin@123456'),
                'role_id' => $adminRole->id,
                'is_active' => true,
            ]
        );
    }
}

