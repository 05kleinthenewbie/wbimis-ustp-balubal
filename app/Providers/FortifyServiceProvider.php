<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Http\Responses\LoginResponse;
use App\Http\Responses\RegisterResponse;
use App\Http\Responses\VerifyEmailResponse;
use App\Models\StudentRoster;
use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;
use Laravel\Fortify\Contracts\RegisterResponse as RegisterResponseContract;
use Laravel\Fortify\Contracts\VerifyEmailResponse as VerifyEmailResponseContract;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(LoginResponseContract::class, LoginResponse::class);
        $this->app->singleton(RegisterResponseContract::class, RegisterResponse::class);
        $this->app->singleton(VerifyEmailResponseContract::class, VerifyEmailResponse::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureActions();
        $this->configureAuthentication();
        $this->configureViews();
        $this->configureRateLimiting();
    }

    /**
     * Configure Fortify actions.
     */
    private function configureActions(): void
    {
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);
        Fortify::createUsersUsing(CreateNewUser::class);
    }

    /**
     * Configure custom authentication logic, including account status checks.
     */
    private function configureAuthentication(): void
    {
        Fortify::authenticateUsing(function (Request $request) {
            $login = trim((string) $request->input(Fortify::username()));

            $user = User::where('email', $login)->first();

            if (! $user || ! Hash::check($request->password, $user->password)) {
                return null;
            }

            if ($user->isTechnician()) {
                throw ValidationException::withMessages([
                    Fortify::username() => 'Technician records do not have login accounts. Please contact the ICT office.',
                ]);
            }

            if ($user->status === 'pending') {
                throw ValidationException::withMessages([
                    Fortify::username() => 'Your account is pending ICT Admin approval. You will be able to log in once approved.',
                ]);
            }

            if ($user->status === 'rejected') {
                throw ValidationException::withMessages([
                    Fortify::username() => 'Your registration was not approved. Please contact the ICT office.',
                ]);
            }

            if ($user->status === 'inactive') {
                throw ValidationException::withMessages([
                    Fortify::username() => 'Your account has been deactivated. Please contact the ICT office.',
                ]);
            }

            $portal = $request->input('portal');
            $role = $user->role?->role_name;

            if ($portal === 'admin' && $role !== 'ict_admin') {
                throw ValidationException::withMessages([
                    Fortify::username() => 'This sign-in form is for ICT administrators only. Faculty and staff should use the Faculty sign-in page.',
                ]);
            }

            if ($portal === 'faculty' && $role !== 'faculty_staff') {
                throw ValidationException::withMessages([
                    Fortify::username() => 'This sign-in form is for faculty and staff only. Administrators should use the Administrator sign-in page.',
                ]);
            }

            return $user;
        });
    }

    /**
     * Configure Fortify views.
     */
    private function configureViews(): void
    {
        Fortify::loginView(fn (Request $request) => Inertia::render('auth/login-portal', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::resetPasswordView(fn (Request $request) => Inertia::render('auth/reset-password', [
            'email' => $request->email,
            'token' => $request->route('token'),
        ]));

        Fortify::requestPasswordResetLinkView(fn (Request $request) => Inertia::render('auth/forgot-password', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::verifyEmailView(fn (Request $request) => Inertia::render('auth/verify-email', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::registerView(fn () => Inertia::render('auth/register', [
            'programs' => StudentRoster::PROGRAMS,
            'passwordRules' => 'minlength:12; required: lower; required: upper; required: digit; required: [!@#$%^&*(),.?":{}|<>_-];',
        ]));

        Fortify::confirmPasswordView(fn () => Inertia::render('auth/confirm-password'));
    }

    /**
     * Configure rate limiting.
     */
    private function configureRateLimiting(): void
    {
        RateLimiter::for('login', function (Request $request) {
            $throttleKey = Str::transliterate(Str::lower($request->input(Fortify::username())).'|'.$request->ip());

            return Limit::perMinute(5)->by($throttleKey);
        });
    }
}
