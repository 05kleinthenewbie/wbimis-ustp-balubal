<?php

namespace App\Http\Controllers;

use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class RegistrationValidationController extends Controller
{
    /**
     * Check whether registration details are available before the applicant
     * advances past the account details step.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'string', 'email', 'max:191'],
            'id_number' => ['nullable', 'string', 'max:20'],
            'role' => ['required', Rule::in(['faculty', 'student'])],
        ]);

        $errors = [];
        $email = trim($data['email']);

        $emailInUse = User::query()
            ->whereRaw('LOWER(email) = ?', [Str::lower($email)])
            ->whereIn('status', ['pending', 'active'])
            ->exists();

        if ($emailInUse) {
            $errors['email'] = 'This email address is already registered. Sign in instead or use a different email.';
        }

        if ($data['role'] === 'student') {
            $idNumber = trim((string) ($data['id_number'] ?? ''));

            if ($idNumber === '') {
                $errors['id_number'] = 'Enter your student ID number.';
            } elseif (! ctype_digit($idNumber)) {
                $errors['id_number'] = 'Use numbers only for your student ID number.';
            } elseif (strlen($idNumber) !== 10) {
                $errors['id_number'] = 'Student ID number must be exactly 10 digits.';
            } else {
                $idInUse = StudentProfile::query()
                    ->where('id_number', $idNumber)
                    ->whereHas('user', fn ($query) => $query->whereNotIn('status', ['inactive', 'rejected']))
                    ->exists();

                if ($idInUse) {
                    $errors['id_number'] = 'This student ID number is already linked to another account.';
                }
            }
        }

        return response()->json([
            'valid' => $errors === [],
            'errors' => $errors,
        ]);
    }
}
