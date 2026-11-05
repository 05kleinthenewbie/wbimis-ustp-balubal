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
                'email' => 'This sign-in form is for students only. Faculty and staff should use the main login page.',
            ]);
        }

        if ($user->status === 'pending') {
            throw ValidationException::withMessages([
                'email' => 'Your account is pending ICT Admin approval. Please contact the ICT office.',
            ]);
        }

        if ($user->status === 'rejected') {
            throw ValidationException::withMessages(['email' => 'Your registration needs attention. Please contact the ICT office.']);
        }

        if ($user->status !== 'active') {
            throw ValidationException::withMessages([
                'email' => 'Your account has been deactivated. Please contact the ICT office.',
            ]);
        }

        Auth::login($user, $request->boolean('remember'));
        $request->session()->regenerate();

        return redirect()->intended(route('dashboard'));
    }
}
