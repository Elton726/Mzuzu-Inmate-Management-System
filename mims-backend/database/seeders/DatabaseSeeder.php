<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Core reference data
        $this->call(RoleSeeder::class);

        // Create a default admin user (credentials in AdminUserSeeder).
        $this->call(AdminUserSeeder::class);

        // Seed sample data for the admission module (cells/activities).
        $this->call(AdmissionModuleSeeder::class);
        $this->call(CellSeeder::class);

        // Seed female inmates with their current admissions + active cell allocations.
        $this->call(FemaleInmateSeeder::class);

        // Create a regular user you can use for smoke testing.

        $defaultRole = Role::firstOrCreate(['name' => 'officer_on_duty'], ['description' => null]);
        User::updateOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'password' => Hash::make('password'),
                'role_id' => $defaultRole->id,
                'is_active' => true,
            ]
        );
    }
}
