<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class BrevoMailService
{
    private string $endpoint = 'https://api.brevo.com/v3/smtp/email';

    /**
     * Send a transactional email through the Brevo HTTP API.
     *
     * @param  array<int, array{email: string, name?: string}>  $to
     */
    public function send(array $to, string $subject, string $html, ?string $text = null): array
    {
        $key = (string) config('services.brevo.key');
        $senderEmail = (string) (config('services.brevo.sender_email') ?? config('mail.from.address'));
        $senderName = (string) (config('services.brevo.sender_name') ?? config('mail.from.name'));

        if ($key === '') {
            throw new RuntimeException('BREVO_API_KEY is not configured.');
        }

        if ($senderEmail === '') {
            throw new RuntimeException('BREVO_SENDER_EMAIL is not configured.');
        }

        $payload = [
            'sender' => ['email' => $senderEmail, 'name' => $senderName],
            'to' => $to,
            'subject' => $subject,
            'htmlContent' => $html,
        ];

        if ($text !== null) {
            $payload['textContent'] = $text;
        }

        $response = Http::withHeaders([
            'api-key' => $key,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ])->post($this->endpoint, $payload);

        if (! $response->successful()) {
            throw new RuntimeException('Brevo API error: '.$response->body());
        }

        return (array) $response->json();
    }

    /**
     * Send the post-registration welcome email to a newly registered user.
     *
     * The status is checked at send time (not registration time) because the
     * email is queued — an admin may approve the account before the worker
     * picks the job up. Approved users get the approved wording instead of
     * the pending-approval wording.
     */
    public function sendWelcomeEmail(string $email, string $name, bool $isApproved = false): array
    {
        $appName = (string) config('app.name');
        $loginUrl = (string) config('app.url').'/login';

        $subject = $isApproved
            ? "Welcome to {$appName} — your account is ready"
            : "Welcome to {$appName} — registration received";

        $html = view('emails.auth.welcome', [
            'name' => $name,
            'appName' => $appName,
            'loginUrl' => $loginUrl,
            'isApproved' => $isApproved,
        ])->render();

        $text = $isApproved
            ? "Hi {$name}, thank you for registering at {$appName}. Your account is approved and ready — log in here: {$loginUrl}"
            : "Hi {$name}, thank you for registering at {$appName}. Your account is pending approval. Log in here: {$loginUrl}";

        return $this->send(
            [['email' => $email, 'name' => $name]],
            $subject,
            $html,
            $text,
        );
    }

    /**
     * Send the registration verification code to a prospective user.
     */
    public function sendRegistrationOtpEmail(string $email, string $name, string $code, int $expiresInMinutes): array
    {
        $appName = (string) config('app.name');

        $html = view('emails.auth.registration-otp', [
            'name' => $name,
            'appName' => $appName,
            'code' => $code,
            'expiresInMinutes' => $expiresInMinutes,
        ])->render();

        return $this->send(
            [['email' => $email, 'name' => $name]],
            "Your {$appName} verification code",
            $html,
            "Hi {$name}, your {$appName} verification code is {$code}. It expires in {$expiresInMinutes} minutes.",
        );
    }

    /**
     * Send the password reset link to a user who requested one.
     *
     * The plain-text version ends with the bare URL so tests can extract the
     * reset link from the recorded Brevo payload.
     */
    public function sendPasswordResetEmail(string $email, string $name, string $resetUrl, int $expiresInMinutes): array
    {
        $appName = (string) config('app.name');

        $html = view('emails.auth.password-reset', [
            'name' => $name,
            'appName' => $appName,
            'resetUrl' => $resetUrl,
            'expiresInMinutes' => $expiresInMinutes,
        ])->render();

        return $this->send(
            [['email' => $email, 'name' => $name]],
            "Reset your {$appName} password",
            $html,
            "Hi {$name}, reset your {$appName} password by opening this link: {$resetUrl}",
        );
    }

    /**
     * Send the account-approved email to a newly approved user.
     */
    public function sendAccountApprovedEmail(string $email, string $name): array
    {
        $appName = (string) config('app.name');
        $loginUrl = (string) config('app.url').'/login';

        $subject = "Your {$appName} account has been approved";

        $html = view('emails.auth.account-approved', [
            'name' => $name,
            'appName' => $appName,
            'loginUrl' => $loginUrl,
        ])->render();

        return $this->send(
            [['email' => $email, 'name' => $name]],
            $subject,
            $html,
            "Hi {$name}, your account at {$appName} has been approved. You can now log in here: {$loginUrl}",
        );
    }

    public function sendStudentRegistrationDecisionEmail(string $email, string $name, string $decision, ?string $reason): array
    {
        $appName = (string) config('app.name');
        $approved = $decision === 'approved';
        $subject = $approved
            ? "Your {$appName} student registration has been approved"
            : "Your {$appName} student registration needs attention";
        $message = $approved
            ? 'Your student account is approved. You can now sign in.'
            : 'Your registration needs attention. '.($reason ?: 'Please contact the ICT office for next steps.');
        $html = '<p>Hi '.e($name).',</p><p>'.e($message).'</p>';

        return $this->send(
            [['email' => $email, 'name' => $name]],
            $subject,
            $html,
            "Hi {$name}, {$message}",
        );
    }
}
