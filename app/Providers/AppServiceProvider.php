<?php

namespace App\Providers;

use App\Events\UserApproved;
use App\Listeners\Auth\SendAccountApprovedEmailViaBrevo;
use App\Listeners\Auth\SendWelcomeEmailViaBrevo;
use App\Models\Notification;
use App\Observers\NotificationObserver;
use App\Services\StudentVerification\CorParser;
use App\Services\StudentVerification\ProgramCatalog;
use App\Services\StudentVerification\QrPayloadParser;
use Carbon\CarbonImmutable;
use GuzzleHttp\Client;
use Illuminate\Auth\Events\Logout;
use Illuminate\Auth\Events\Registered;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Minishlink\WebPush\WebPush;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(ProgramCatalog::class, fn () => new ProgramCatalog(config('student-verification.programs')));
        $this->app->bind(QrPayloadParser::class, fn () => new QrPayloadParser(trim(config('student-verification.student_number_pattern'), '^$')));
        $this->app->bind(CorParser::class, fn ($app) => new CorParser($app->make(ProgramCatalog::class), config('student-verification.student_number_pattern')));
        $this->app->bind(WebPush::class, fn (): WebPush => new WebPush([
            'VAPID' => [
                'subject' => config('services.webpush.subject'),
                'publicKey' => config('services.webpush.public_key'),
                'privateKey' => config('services.webpush.private_key'),
            ],
        ], ['TTL' => 86400, 'urgency' => 'normal'], new Client([
            'timeout' => 10,
            'connect_timeout' => 5,
            'allow_redirects' => false,
        ])));
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        Notification::observe(NotificationObserver::class);
        Event::listen(Logout::class, function (Logout $event): void {
            $hash = request()->cookie('push_subscription');
            if ($event->user !== null && is_string($hash)) {
                DB::table('push_subscriptions')->where('user_id', $event->user->getAuthIdentifier())
                    ->where('endpoint_hash', $hash)->delete();
            }
        });

        Event::listen(Registered::class, SendWelcomeEmailViaBrevo::class);
        Event::listen(UserApproved::class, SendAccountApprovedEmailViaBrevo::class);
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(8)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
