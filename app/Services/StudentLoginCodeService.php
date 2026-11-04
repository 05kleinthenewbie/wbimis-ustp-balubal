<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use SensitiveParameter;

class StudentLoginCodeService
{
    public const EXPIRY_MINUTES = 5;

    /**
     * @return array{code: string, expiresAt: string}
     */
    public function issue(User $user): array
    {
        return DB::transaction(function () use ($user): array {
            $owner = User::query()->lockForUpdate()->findOrFail($user->id);
            abort_unless($owner->status === 'active' && $owner->role?->role_name === 'student' && ! $owner->isTechnician(), 403);

            $code = 'WBIMIS:'.Str::random(32);
            $expiresAt = now()->addMinutes(self::EXPIRY_MINUTES);
            DB::table('student_login_codes')->updateOrInsert(['user_id' => $owner->id], [
                'token_hash' => hash('sha256', $code),
                'expires_at' => $expiresAt,
                'used_at' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return ['code' => $code, 'expiresAt' => $expiresAt->toIso8601String()];
        });
    }

    public function redeem(#[SensitiveParameter] string $code): User
    {
        return DB::transaction(function () use ($code): User {
            $hash = hash('sha256', $code);
            $record = DB::table('student_login_codes')->where('token_hash', $hash)->first();
            if ($record === null) {
                $this->invalidCode();
            }

            $user = User::query()->lockForUpdate()->find($record->user_id);
            if ($user === null || $user->status !== 'active' || $user->role?->role_name !== 'student' || $user->isTechnician()) {
                $this->invalidCode();
            }

            $consumed = DB::table('student_login_codes')->where('token_hash', $hash)
                ->whereNull('used_at')->where('expires_at', '>', now())
                ->update(['used_at' => now(), 'updated_at' => now()]);
            if ($consumed !== 1) {
                $this->invalidCode();
            }

            return $user;
        });
    }

    private function invalidCode(): never
    {
        throw ValidationException::withMessages([
            'code' => 'This login code is invalid, expired, or already used. Generate a new code from your signed-in student account.',
        ]);
    }
}
