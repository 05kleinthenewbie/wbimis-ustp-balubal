<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Fortify\CreateNewUser;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends ApiController
{
    /**
     * Authenticate a user and return a JWT token.
     */
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $login = trim($credentials['email']);

        $user = preg_match('/^\d{10}$/', $login) === 1
            ? User::where('id_number', $login)->first()
            : User::where('email', $login)->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => 'The provided credentials do not match our records.',
            ]);
        }

        if ($user->isTechnician()) {
            abort(403, 'Technician records do not have login accounts. Please contact the ICT office.');
        }

        if (! $user->isStudent() && $user->status === 'pending') {
            abort(403, 'Your account is pending ICT Admin approval. You will be able to log in once approved.');
        }

        if ($user->status === 'inactive') {
            abort(403, 'Your account has been deactivated. Please contact the ICT office.');
        }

        if (! $user->isStudent() && $user->status === 'rejected') {
            abort(403, 'Your registration was not approved. Please contact the ICT office.');
        }

        if (! $user->isStudent() && ! $user->is_approved && ! $user->isAdministrator()) {
            abort(403, 'Your account is pending administrator approval. You will be able to log in once approved.');
        }

        $token = auth('api')->login($user);

        return $this->respondWithToken($token, $user);
    }

    /**
     * Register a new user account.
     */
    public function register(Request $request): JsonResponse
    {
        $user = app(CreateNewUser::class)->createWithoutEmailVerification($request->only([
            'name',
            'email',
            'password',
            'password_confirmation',
            'role',
            'department',
            'employment_type',
            'id_number',
        ]));

        return response()->json([
            'message' => $user->isStudent() ? 'Account created. Sign in to verify your email and submit your student ID and COR for review.' : ($user->is_approved
                ? 'Account created successfully. You can now log in.'
                : 'Account created successfully. Please wait for admin approval before logging in.'),
            'user' => $user->load('role'),
        ], 201);
    }

    /**
     * Refresh the current JWT token.
     */
    public function refresh(): JsonResponse
    {
        $token = auth('api')->refresh();

        return $this->respondWithToken($token, auth('api')->user());
    }

    /**
     * Invalidate the current JWT token.
     */
    public function logout(): JsonResponse
    {
        auth('api')->logout();

        return response()->json(['message' => 'Successfully logged out.']);
    }

    /**
     * Return the authenticated user.
     */
    public function me(): JsonResponse
    {
        $user = $this->user()?->load('role');

        return response()->json(['user' => $user]);
    }

    /**
     * Build the standard JWT response payload.
     */
    protected function respondWithToken(string $token, ?User $user): JsonResponse
    {
        return response()->json([
            'access_token' => $token,
            'token_type' => 'bearer',
            'expires_in' => auth('api')->factory()->getTTL() * 60,
            'user' => $user?->load('role'),
        ]);
    }
}
