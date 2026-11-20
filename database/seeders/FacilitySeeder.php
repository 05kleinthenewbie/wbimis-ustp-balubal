<?php

namespace Database\Seeders;

use App\Models\Facility;
use Illuminate\Database\Seeder;

class FacilitySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $facilities = [
            [
                'facility_name' => 'Computer Laboratory',
                'facility_type' => 'computer_lab',
                'capacity' => 40,
                'location' => 'ICT Building',
                'availability_status' => 'available',
            ],
            [
                'facility_name' => 'Computer Laboratory 2',
                'facility_type' => 'computer_lab',
                'capacity' => 40,
                'location' => 'ICT Building',
                'availability_status' => 'available',
            ],
            [
                'facility_name' => 'ICT Office',
                'facility_type' => 'office',
                'capacity' => 10,
                'location' => 'ICT Building',
                'availability_status' => 'available',
            ],
            [
                'facility_name' => 'Classroom',
                'facility_type' => 'classroom',
                'capacity' => 60,
                'location' => 'Main Building',
                'availability_status' => 'available',
            ],
        ];

        foreach ($facilities as $facility) {
            Facility::firstOrCreate(
                ['facility_name' => $facility['facility_name']],
                $facility
            );
        }
    }
}
