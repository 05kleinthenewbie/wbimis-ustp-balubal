<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(RoleSeeder::class);

        $adminRole = Role::where('role_name', 'ict_admin')->first();

        $admin = User::firstOrCreate(
            ['email' => 'admin@ustp.edu.ph'],
            [
                'name' => 'Anthony Michael Chua',
                'password' => bcrypt('password123'),
                'role_id' => $adminRole->id,
                'department' => 'ICT Office',
                'status' => 'active',
                'email_verified_at' => now(),
                'is_approved' => true,
            ]
        );

        if ($admin->name !== 'Anthony Michael Chua') {
            $admin->update(['name' => 'Anthony Michael Chua']);
        }

        $facultyRole = Role::where('role_name', 'faculty')->first();

        $faculty = User::firstOrCreate(
            ['email' => 'faculty@ustp.edu.ph'],
            [
                'name' => 'Prof. Maria Santos',
                'password' => bcrypt('password123'),
                'role_id' => $facultyRole->id,
                'department' => 'College of Engineering',
                'status' => 'active',
                'email_verified_at' => now(),
                'is_approved' => true,
            ]
        );

        $this->call(ServiceCategorySeeder::class);
        $this->call(ServiceTypeSeeder::class);
        $this->call(FacilitySeeder::class);
        $this->call(InventoryItemSeeder::class);
    }
}
