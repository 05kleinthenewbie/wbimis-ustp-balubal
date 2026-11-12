<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class StudentLoginController extends Controller
{
    /**
     * Display the dedicated student sign-in form.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('auth/student-login', [
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Authenticate a student with their email address and password.
     */
    public function store(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', Str::lower(trim($credentials['email'])))->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => 'The email address and password do not match our records.',
            ]);
        }

        if ($user->role?->role_name !== 'student') {
            throw ValidationException::withMessages([
                'email' => 'This sign-in form is for students only. Faculty should use the main login page.',
            ]);
        }

        if ($user->status === 'inactive') {
            throw ValidationException::withMessages([
                'email' => 'Your account has been deactivated. Please contact the ICT office.',
            ]);
        }

        if ($user->approval_status === 'rejected') {
            throw ValidationException::withMessages([
                'email' => 'Your registration was rejected. Please contact the ICT office for assistance.',
            ]);
        }

        if ($user->approval_status !== 'approved') {
            throw ValidationException::withMessages([
                'email' => 'Your account is awaiting ICT Admin approval. You can sign in once your registration has been reviewed.',
            ]);
        }

        if ($user->email_verified_at === null) {
            throw ValidationException::withMessages([
                'email' => 'Please verify your email address before signing in.',
            ]);
        }

        Auth::login($user, $request->boolean('remember'));
        $request->session()->regenerate();

        return redirect()->intended(route('dashboard'));
    }
}
