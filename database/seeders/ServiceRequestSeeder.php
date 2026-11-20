<?php

namespace Database\Seeders;

use App\Models\ServiceRequest;
use Illuminate\Database\Seeder;

class ServiceRequestSeeder extends Seeder
{
    public function run(): void
    {
        $requests = [
            [
                'user_id' => 3,
                'problem_description' => 'Our office computer keeps losing network connection every few minutes. The Ethernet cable has been checked and appears fine. This is affecting our daily operations as we rely on the network for email and file access.',
                'priority_level' => 'high',
                'request_status' => 'approved',
                'date_requested' => '2026-08-25 09:15:00',
                'services' => [
                    ['service_type_id' => 1, 'specification' => 'Desktop PC in Room 102, Ethernet port seems fine', 'quantity' => 1, 'action_type' => 'Troubleshoot'],
                ],
            ],
            [
                'user_id' => 4,
                'problem_description' => 'Need to install Microsoft 365 on the new faculty laptop. The laptop is a Lenovo ThinkPad E14 running Windows 11. Please also install any required device drivers.',
                'priority_level' => 'medium',
                'request_status' => 'pending',
                'date_requested' => '2026-08-28 14:30:00',
                'services' => [
                    ['service_type_id' => 11, 'specification' => 'Microsoft 365 (Word, Excel, PowerPoint, Outlook)', 'quantity' => 1, 'action_type' => 'Installation'],
                    ['service_type_id' => 13, 'specification' => 'Lenovo ThinkPad E14 drivers for Windows 11', 'quantity' => 1, 'action_type' => 'Installation'],
                ],
            ],
            [
                'user_id' => 5,
                'problem_description' => 'The printer in Computer Lab B is not printing. It shows a paper jam error but we already removed all visible paper. The printer is an HP LaserJet Pro M404dn.',
                'priority_level' => 'urgent',
                'request_status' => 'completed',
                'date_requested' => '2026-08-20 08:00:00',
                'services' => [
                    ['service_type_id' => 7, 'specification' => 'HP LaserJet Pro M404dn in Computer Lab B (Room 202)', 'quantity' => 1, 'action_type' => 'Troubleshoot'],
                ],
            ],
            [
                'user_id' => 6,
                'problem_description' => 'We need a new internet connection for the newly assigned room (Room 305). The room will be used as a temporary office for the research team. We need at least 4 Ethernet ports.',
                'priority_level' => 'low',
                'request_status' => 'pending',
                'date_requested' => '2026-08-29 10:45:00',
                'services' => [
                    ['service_type_id' => 2, 'specification' => 'Room 305, 4 Ethernet ports, research team use', 'quantity' => 4, 'action_type' => 'New Connection'],
                ],
            ],
            [
                'user_id' => 7,
                'problem_description' => 'My office laptop (Acer TravelMate P2) has a defective screen. The display flickers constantly and sometimes goes completely black. The laptop is still under warranty if repair is needed.',
                'priority_level' => 'medium',
                'request_status' => 'rejected',
                'date_requested' => '2026-08-22 11:20:00',
                'services' => [
                    ['service_type_id' => 6, 'specification' => 'Acer TravelMate P2, screen flickering issue', 'quantity' => 1, 'action_type' => 'Troubleshoot'],
                ],
            ],
        ];

        foreach ($requests as $data) {
            $services = $data['services'];
            unset($data['services']);

            $request = ServiceRequest::create($data);

            foreach ($services as $service) {
                $request->requestServices()->create($service);
            }
        }
    }
}
