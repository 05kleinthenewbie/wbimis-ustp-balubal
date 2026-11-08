<?php

namespace App\Http\Controllers;

use App\Actions\Fortify\CreateNewUser;
use App\Services\BrevoMailService;
use App\Services\RegistrationOtpService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class RegisterOtpController extends Controller
{
    public function __construct(
        private RegistrationOtpService $registrationOtp,
        private CreateNewUser $createNewUser,
        private BrevoMailService $mail,
    ) {}

    /**
     * Show the OTP verification page for a pending registration.
     */
    public function show(Request $request): Response|RedirectResponse
    {
        $email = $this->pendingEmail($request);

        if ($email === null) {
            return redirect()->route('register');
        }

        return Inertia::render('auth/register-otp', [
            'email' => $email,
            'status' => $request->session()->get('status'),
            'studentRegistration' => ($this->registrationOtp->pending($email)['payload']['role'] ?? null) === 'student',
        ]);
    }

    /**
     * Confirm the emailed OTP and create the account.
     */
    public function verify(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'regex:/^[0-9]{6}$/'],
        ]);

        $email = $this->pendingEmail($request);

        if ($email === null) {
            return redirect()->route('register')->withErrors([
                'email' => 'Your verification session has expired. Please register again.',
            ]);
        }

        $input = $this->registrationOtp->verify($email, $data['code']);

        $user = $this->createNewUser->createVerified($input);
        $user->forceFill(['email_verified_at' => now()])->save();

        $this->registrationOtp->forget($email);
        $request->session()->forget('registration_otp_email');
        $request->session()->regenerate();

        event(new Registered($user));

        $isStudent = $user->role?->role_name === 'student';
        $status = $user->is_approved
            ? 'Registration successful! You can now log in to your account.'
            : 'Registration successful! Your account is pending administrator approval. You will be able to log in once an ICT admin approves your account.';

        if ($isStudent) {
            $status = 'Registration successful! Your Certificate of Registration has been received and is awaiting administrator approval.';
        }

        return redirect()
            ->route($isStudent ? 'student.login' : 'faculty.login')
            ->with('status', $status);
    }

    /**
     * Email a fresh OTP for the pending registration.
     */
    public function resend(Request $request): RedirectResponse
    {
        $email = $this->pendingEmail($request);

        if ($email === null) {
            return redirect()->route('register')->withErrors([
                'email' => 'Your verification session has expired. Please register again.',
            ]);
        }

        $throttleKey = 'registration-otp:'.Str::lower($email).'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, 3)) {
            throw ValidationException::withMessages([
                'resend' => 'Too many verification codes requested. Please wait '.RateLimiter::availableIn($throttleKey).' seconds before requesting another.',
            ]);
        }

        RateLimiter::hit($throttleKey, 60);

        $pending = $this->registrationOtp->pending($email);
        $name = (string) ($pending['payload']['name'] ?? '');
        $code = RegistrationOtpService::generateCode();

        try {
            $this->mail->sendRegistrationOtpEmail(
                $email,
                $name,
                $code,
                RegistrationOtpService::EXPIRY_MINUTES,
            );
        } catch (RuntimeException|ConnectionException $exception) {
            report($exception);

            throw ValidationException::withMessages([
                'resend' => 'We could not send a new verification code. Please try again.',
            ]);
        }

        $this->registrationOtp->replaceCode($email, $code);

        return redirect()->route('register.otp.show')->with(
            'status',
            "A new verification code has been sent to {$email}.",
        );
    }

    /**
     * Resolve the pending registration email, or null when there is none.
     */
    private function pendingEmail(Request $request): ?string
    {
        $email = $request->session()->get('registration_otp_email');

        if (! is_string($email) || $email === '') {
            return null;
        }

        return $this->registrationOtp->pending($email) === null ? null : $email;
    }
}
