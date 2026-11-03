<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Minishlink\WebPush\VAPID;

#[Signature('push:vapid')]
#[Description('Generate a VAPID key pair to store in your deployment environment')]
class GenerateVapidKeys extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $keys = VAPID::createVapidKeys();
        $this->line('VAPID_PUBLIC_KEY='.$keys['publicKey']);
        $this->line('VAPID_PRIVATE_KEY='.$keys['privateKey']);
        $this->info('Store these keys securely. Keep the same pair across deployments.');

        return self::SUCCESS;
    }
}
