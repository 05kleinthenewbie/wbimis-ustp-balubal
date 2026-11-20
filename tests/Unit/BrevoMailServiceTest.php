<?php

use App\Services\BrevoMailService;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

uses(TestCase::class);

test('sends email through Brevo API', function () {
    config()->set('services.brevo.key', 'test-key');
    config()->set('services.brevo.sender_email', 'noreply@example.com');
    config()->set('services.brevo.sender_name', 'Test App');

    Http::fake([
        'api.brevo.com/*' => Http::response(['messageId' => 'test-id'], 201),
    ]);

    $result = app(BrevoMailService::class)->send(
        [['email' => 'user@gmail.com', 'name' => 'Test User']],
        'Hello',
        '<p>Hi</p>',
    );

    expect($result['messageId'])->toBe('test-id');

    Http::assertSent(function ($request) {
        return $request->url() === 'https://api.brevo.com/v3/smtp/email'
            && $request->header('api-key') === ['test-key']
            && $request['subject'] === 'Hello'
            && $request['to'][0]['email'] === 'user@gmail.com';
    });
});

test('throws when Brevo API key is missing', function () {
    config()->set('services.brevo.key', '');

    expect(fn () => app(BrevoMailService::class)->send(
        [['email' => 'user@gmail.com']],
        'Hello',
        '<p>Hi</p>',
    ))->toThrow(RuntimeException::class, 'BREVO_API_KEY');
});

test('welcome email uses approved wording when account is already active', function () {
    config()->set('services.brevo.key', 'test-key');
    config()->set('services.brevo.sender_email', 'noreply@example.com');
    config()->set('services.brevo.sender_name', 'Test App');

    Http::fake([
        'api.brevo.com/*' => Http::response(['messageId' => 'welcome-id'], 201),
    ]);

    app(BrevoMailService::class)->sendWelcomeEmail('user@gmail.com', 'Ready User', true);

    Http::assertSent(function ($request) {
        return $request['to'][0]['email'] === 'user@gmail.com'
            && str_contains((string) $request['subject'], 'ready')
            && str_contains((string) $request['htmlContent'], 'approved and ready')
            && ! str_contains((string) $request['htmlContent'], 'pending approval');
    });
});

test('welcome email uses pending wording when account is not approved', function () {
    config()->set('services.brevo.key', 'test-key');
    config()->set('services.brevo.sender_email', 'noreply@example.com');
    config()->set('services.brevo.sender_name', 'Test App');

    Http::fake([
        'api.brevo.com/*' => Http::response(['messageId' => 'welcome-id'], 201),
    ]);

    app(BrevoMailService::class)->sendWelcomeEmail('user@gmail.com', 'Waiting User');

    Http::assertSent(function ($request) {
        return $request['to'][0]['email'] === 'user@gmail.com'
            && str_contains((string) $request['htmlContent'], 'pending approval');
    });
});
test('registration OTP email uses the branded WBIMIS template', function () {
    config()->set('services.brevo.key', 'test-key');
    config()->set('services.brevo.sender_email', 'noreply@example.com');
    config()->set('services.brevo.sender_name', 'Test App');

    Http::fake([
        'api.brevo.com/*' => Http::response(['messageId' => 'otp-id'], 201),
    ]);

    app(BrevoMailService::class)->sendRegistrationOtpEmail(
        'user@gmail.com',
        'Test User',
        '123456',
        10,
    );

    Http::assertSent(function ($request) {
        $html = (string) $request['htmlContent'];

        return str_contains($html, '123456')
            && str_contains($html, 'Verify your email address')
            && str_contains($html, '#1a1851')
            && str_contains($html, '#fcb315')
            && str_contains($html, 'ustp-logo-email.png');
    });
});

test('student decision email uses the branded template and shows the reason', function () {
    config()->set('services.brevo.key', 'test-key');
    config()->set('services.brevo.sender_email', 'noreply@example.com');
    config()->set('services.brevo.sender_name', 'Test App');

    Http::fake([
        'api.brevo.com/*' => Http::response(['messageId' => 'decision-id'], 201),
    ]);

    app(BrevoMailService::class)->sendStudentRegistrationDecisionEmail(
        'student@gmail.com',
        'Student User',
        'rejected',
        'Upload a clearer copy of your Certificate of Registration.',
    );

    Http::assertSent(function ($request) {
        $html = (string) $request['htmlContent'];

        return str_contains($html, 'Action needed on your registration')
            && str_contains($html, 'Upload a clearer copy of your Certificate of Registration.')
            && str_contains($html, '#1a1851')
            && str_contains($html, 'ustp-logo-email.png');
    });
});

test('sends account-approved email through Brevo API', function () {
    config()->set('services.brevo.key', 'test-key');
    config()->set('services.brevo.sender_email', 'noreply@example.com');
    config()->set('services.brevo.sender_name', 'Test App');

    Http::fake([
        'api.brevo.com/*' => Http::response(['messageId' => 'approved-id'], 201),
    ]);

    $result = app(BrevoMailService::class)->sendAccountApprovedEmail('user@gmail.com', 'Approved User');

    expect($result['messageId'])->toBe('approved-id');

    Http::assertSent(function ($request) {
        return $request->url() === 'https://api.brevo.com/v3/smtp/email'
            && $request['to'][0]['email'] === 'user@gmail.com'
            && str_contains((string) $request['subject'], 'approved');
    });
});
