<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class RegistrationOtpService
{
    /**
     * Number of minutes a registration OTP remains valid.
     */
    public const EXPIRY_MINUTES = 10;

    /**
     * Number of incorrect attempts allowed before the OTP is invalidated.
     */
    public const MAX_ATTEMPTS = 5;

    /**
     * Generate a random six-digit verification code.
     */
    public static function generateCode(): string
    {
        return (string) random_int(100000, 999999);
    }

    /**
     * The cache key holding the pending registration for an email address.
     */
    public static function key(string $email): string
    {
        return 'registration:otp:'.strtolower($email);
    }

    /**
     * Store the pending registration payload and return the OTP code to email.
     *
     * @param  array<string, mixed>  $input
     */
    public function issue(string $email, array $input): string
    {
        $code = self::generateCode();

        $payload = $input;
        unset($payload['password_confirmation'], $payload['terms']);
        unset($payload['cor']);
        $payload['password'] = Crypt::encryptString((string) $payload['password']);

        Cache::put(self::key($email), [
            'code' => Hash::make($code),
            'payload' => $payload,
            'attempts' => 0,
        ], now()->addMinutes(self::EXPIRY_MINUTES));

        return $code;
    }

    /**
     * Swap the stored OTP for a freshly generated one, keeping the payload.
     */
    public function replaceCode(string $email, string $code): bool
    {
        $key = self::key($email);
        $pending = Cache::get($key);

        if (! is_array($pending)) {
            return false;
        }

        $pending['code'] = Hash::make($code);
        $pending['attempts'] = 0;

        Cache::put($key, $pending, now()->addMinutes(self::EXPIRY_MINUTES));

        return true;
    }

    /**
     * Return the pending registration data for an email, if still valid.
     *
     * @return array<string, mixed>|null
     */
    public function pending(string $email): ?array
    {
        $pending = Cache::get(self::key($email));

        return is_array($pending) ? $pending : null;
    }

    /**
     * Validate an OTP and return the decrypted registration payload.
     *
     * @return array<string, mixed>
     *
     * @throws ValidationException
     */
    public function verify(string $email, string $code): array
    {
        $key = self::key($email);
        $pending = Cache::get($key);

        if (! is_array($pending)) {
            throw ValidationException::withMessages([
                'code' => 'This verification code is no longer valid. Please register again to receive a new one.',
            ]);
        }

        if (! Hash::check($code, (string) $pending['code'])) {
            $attempts = (int) $pending['attempts'] + 1;

            if ($attempts >= self::MAX_ATTEMPTS) {
                Cache::forget($key);

                throw ValidationException::withMessages([
                    'code' => 'Too many incorrect attempts. Please register again to receive a new code.',
                ]);
            }

            $pending['attempts'] = $attempts;
            Cache::put($key, $pending, now()->addMinutes(self::EXPIRY_MINUTES));

            throw ValidationException::withMessages([
                'code' => 'The verification code is incorrect.',
            ]);
        }

        $payload = $pending['payload'];
        $payload['password'] = Crypt::decryptString((string) $payload['password']);

        return $payload;
    }

    /**
     * Discard any pending registration OTP for an email address.
     */
    public function forget(string $email): void
    {
        Cache::forget(self::key($email));
    }
}
