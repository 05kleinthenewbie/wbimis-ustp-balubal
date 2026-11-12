<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $roles = [
            [
                'role_name' => 'ict_admin',
                'role_description' => 'ICT personnel responsible for managing service requests, job orders, inventory, bookings, and system administration.',
            ],
            [
                'role_name' => 'faculty',
                'role_description' => 'Faculty members who can submit service requests, book facilities, and report incidents.',
            ],
            [
                'role_name' => 'student',
                'role_description' => 'Students who can request email account creation and Office 365 access only.',
            ],
        ];

        foreach ($roles as $role) {
            Role::firstOrCreate(
                ['role_name' => $role['role_name']],
                $role
            );
        }
    }
}
