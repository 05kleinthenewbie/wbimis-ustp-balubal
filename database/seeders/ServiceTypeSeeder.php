<?php

namespace Database\Seeders;

use App\Models\ServiceCategory;
use App\Models\ServiceType;
use Illuminate\Database\Seeder;

class ServiceTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $serviceTypes = [
            'Network Services' => [
                ['service_name' => 'Network Connection', 'default_action' => 'New Connection'],
                ['service_name' => 'Internet Connection', 'default_action' => 'Troubleshoot'],
                ['service_name' => 'Printer Connection', 'default_action' => 'New Connection'],
                ['service_name' => 'Phone Connection', 'default_action' => 'New Connection'],
                ['service_name' => 'Others', 'default_action' => null],
            ],
            'Hardware Services' => [
                ['service_name' => 'Computer/Laptop', 'default_action' => 'Troubleshoot'],
                ['service_name' => 'Printer/Scanner', 'default_action' => 'Installation'],
                ['service_name' => 'Tablet/Mobile Phone', 'default_action' => 'Installation'],
                ['service_name' => 'Others', 'default_action' => null],
            ],
            'Software Services' => [
                ['service_name' => 'Operating System', 'default_action' => 'Installation'],
                ['service_name' => 'Office Suites', 'default_action' => 'Installation'],
                ['service_name' => 'Anti-Virus', 'default_action' => 'Installation'],
                ['service_name' => 'Device Drivers', 'default_action' => 'Installation'],
                ['service_name' => 'Others', 'default_action' => null],
            ],
            'Information System Services' => [
                ['service_name' => 'E-mail', 'default_action' => 'Create New'],
                ['service_name' => 'Microsoft 365', 'default_action' => 'Create New'],
                ['service_name' => 'Others', 'default_action' => null],
            ],
        ];

        foreach ($serviceTypes as $categoryName => $types) {
            $category = ServiceCategory::where('category_name', $categoryName)->first();

            if (! $category) {
                continue;
            }

            foreach ($types as $type) {
                ServiceType::firstOrCreate(
                    [
                        'category_id' => $category->id,
                        'service_name' => $type['service_name'],
                    ],
                    $type + ['category_id' => $category->id]
                );
            }
        }
    }
}
