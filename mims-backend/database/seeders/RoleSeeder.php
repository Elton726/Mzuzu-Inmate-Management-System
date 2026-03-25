<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['name' => 'admin', 'description' => 'System administrator'],
            ['name' => 'reception_officer', 'description' => 'Handles inmate admissions'],
            ['name' => 'station_officer', 'description' => 'Oversees inmate records and releases'],
            ['name' => 'officer_on_duty', 'description' => 'Officer on duty'],
            ['name' => 'gatekeeper', 'description' => 'Controls gate access'],
        ];

        foreach ($roles as $role) {
            Role::updateOrCreate(['name' => $role['name']], ['description' => $role['description']]);
        }
    }
}

