<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind different classes or traits.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->beforeEach(fn () => Storage::fake('local'))
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

/**
 * Configure Brevo credentials and fake outbound HTTP for mail tests.
 */
function fakeBrevoMail(): void
{
    config()->set('services.brevo.key', 'test-key');
    config()->set('services.brevo.sender_email', 'noreply@example.com');
    config()->set('services.brevo.sender_name', 'Test App');

    Http::fake([
        'api.brevo.com/*' => Http::response(['messageId' => 'test-id'], 201),
    ]);
}

/**
 * A valid PDF suitable for the Certificate of Registration upload field.
 */
function fakeCorUpload(string $content = '%PDF-1.4 test certificate of registration'): UploadedFile
{
    return UploadedFile::fake()->createWithContent('cor.pdf', $content);
}

/**
 * A valid student ID image.
 */
function fakeStudentIdUpload(): UploadedFile
{
    $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');

    return UploadedFile::fake()->createWithContent('student-id.png', $png);
}

/**
 * A payload accepted by the web registration flow.
 *
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function registrationPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Test User',
        'email' => 'test@ustp.edu.ph',
        'password' => 'password',
        'password_confirmation' => 'password',
        'role' => 'faculty_staff',
        'employment_type' => 'non_teaching',
        'department' => 'Administrative Office',
        'position' => 'Administrative Assistant',
        'contact_no' => '09123456789',
        'terms' => 'on',
    ], $overrides);
}

/**
 * A student registration payload with the profile details required by the
 * web registration flow.
 *
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function studentRegistrationPayload(array $overrides = []): array
{
    return registrationPayload(array_merge([
        'name' => 'Juan S. Dela Cruz',
        'email' => 'student@8.ustp.edu.ph',
        'role' => 'student',
        'employment_type' => null,
        'department' => 'BSIT',
        'educational_level' => 'college',
        'year_level' => '1',
        'cor' => fakeCorUpload(),
        'id_number' => '2023303709',
    ], $overrides));
}

/**
 * Extract the six-digit OTP from the most recently recorded Brevo email.
 */
function registrationOtpCode(): string
{
    $recorded = Http::recorded()->last();

    if ($recorded === null) {
        return '';
    }

    $body = $recorded[0]->body();
    $decoded = json_decode($body, true);
    $html = is_array($decoded) && isset($decoded['htmlContent'])
        ? (string) $decoded['htmlContent']
        : $body;

    preg_match('/\b\d{6}\b/', $html, $matches);

    return $matches[0] ?? '';
}

/**
 * Extract the password reset URL from the most recently recorded Brevo email.
 */
function passwordResetUrl(): string
{
    $recorded = Http::recorded()->last();

    if ($recorded === null) {
        return '';
    }

    $body = $recorded[0]->body();
    $decoded = json_decode($body, true);
    $text = is_array($decoded) && isset($decoded['textContent'])
        ? (string) $decoded['textContent']
        : $body;

    preg_match('#https?://\S+#', $text, $matches);

    return rtrim($matches[0] ?? '', '.,');
}

/**
 * Extract the password reset token from the most recently recorded Brevo email.
 */
function passwordResetToken(): string
{
    $path = parse_url(passwordResetUrl(), PHP_URL_PATH);

    return is_string($path) ? basename($path) : '';
}
