<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\Role;
use App\Models\User;
use App\Services\BrevoMailService;
use App\Services\RegistrationOtpService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Contracts\CreatesNewUsers;
use RuntimeException;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    public function __construct(
        private RegistrationOtpService $registrationOtp,
        private BrevoMailService $mail,
    ) {}

    /**
     * Validate the registration request, email a one-time code to the
     * applicant, and redirect to the OTP verification step. The account
     * itself is only created once the code has been confirmed.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        $input = $this->withFullName($input);
        $this->validateInput($input, requireStudentDetails: true);

        Validator::make($input, [
            'terms' => ['accepted'],
        ], [
            'terms.accepted' => 'You must agree to the Terms of Service and Privacy Policy to continue.',
        ])->validate();

        $email = (string) $input['email'];
        $this->throttleOtpRequest($email);

        $input = $this->storeEmploymentDocument($input);

        $code = $this->registrationOtp->issue($email, $input);

        try {
            $this->mail->sendRegistrationOtpEmail(
                $email,
                (string) $input['name'],
                $code,
                RegistrationOtpService::EXPIRY_MINUTES,
            );
        } catch (RuntimeException|ConnectionException $exception) {
            report($exception);
            $this->registrationOtp->forget($email);
            $this->deleteEmploymentDocument($input);

            throw ValidationException::withMessages([
                'email' => 'We could not send a verification code to your email address. Please try again.',
            ]);
        }

        session()->put('registration_otp_email', $email);

        throw new HttpResponseException(
            redirect()->route('register.otp.show')->with(
                'status',
                "We sent a 6-digit verification code to {$email}. Enter it below to finish creating your account.",
            ),
        );
    }

    /**
     * Create the user account once the emailed OTP has been verified.
     *
     * Student registrations are activated immediately after email
     * verification; there is no document review or approval step.
     * Faculty/staff accounts still wait for admin approval.
     *
     * @param  array<string, string>  $input
     */
    public function createVerified(array $input): User
    {
        $this->applyEmploymentDefaults($input);

        $isStudent = ($input['role'] ?? null) === 'student';
        $studentDetails = $isStudent
            ? $this->studentDetails($input)
            : [
                'employee_id_number' => $input['employee_id_number'] ?? null,
                'position' => $input['position'] ?? null,
                'contact_no' => $input['contact_no'] ?? null,
                'employment_document_path' => $input['employment_document_path'] ?? null,
                'employment_document_original_name' => $input['employment_document_original_name'] ?? null,
            ];

        return DB::transaction(function () use ($input, $isStudent, $studentDetails) {
            $role = Role::where('role_name', $input['role'])->firstOrFail();

            $rejected = User::where('email', $input['email'])
                ->whereIn('status', ['inactive', 'rejected'])
                ->first();

            $attributes = [
                'name' => $input['name'],
                'email' => $input['email'],
                'password' => $input['password'],
                'role_id' => $role->id,
                'department' => $input['department'] ?? null,
                'employment_type' => $input['employment_type'] ?? null,
                'id_number' => $input['id_number'] ?? null,
                ...$studentDetails,
                'status' => $isStudent ? 'active' : 'pending',
                'email_verified_at' => $isStudent ? now() : null,
            ];

            if ($rejected !== null) {
                $rejected->update($attributes);

                return $rejected->refresh();
            }

            return User::create($attributes);
        });
    }

    /**
     * Validate the registration input and create the account immediately,
     * skipping the email OTP step. Used by API clients that cannot complete
     * the browser-based verification flow.
     *
     * @param  array<string, string>  $input
     */
    public function createWithoutEmailVerification(array $input): User
    {
        $input = $this->withFullName($input);
        $this->validateInput($input);

        return $this->createVerified($input);
    }

    /**
     * Compose the account name from separate registration fields while
     * accepting the existing full-name format used by API clients.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    private function withFullName(array $input): array
    {
        if (! array_key_exists('first_name', $input) && ! array_key_exists('last_name', $input) && ! array_key_exists('middle_initial', $input)) {
            return $input;
        }

        $parts = Validator::make($input, [
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'middle_initial' => ['nullable', 'string', 'regex:/^\p{L}\.?$/u'],
        ])->validate();

        $initial = filled($parts['middle_initial'] ?? null)
            ? Str::upper(rtrim($parts['middle_initial'], '.')).'.'
            : null;
        $input['name'] = implode(' ', array_filter([
            trim($parts['first_name']), $initial, trim($parts['last_name']),
        ], fn ($part) => $part !== null));

        return $input;
    }

    /**
     * Validate the raw registration input.
     *
     * @param  array<string, string>  $input
     */
    private function validateInput(array $input, bool $requireStudentDetails = false): void
    {
        $rules = [
            'name' => $this->nameRules(),
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                // Rejected (inactive) accounts may register again, so only
                // pending/active emails block a new registration.
                Rule::unique(User::class)->where(fn ($query) => $query->whereIn('status', ['pending', 'active'])),
            ],
            'role' => ['required', Rule::in(['faculty_staff', 'student'])],
            'employment_type' => [
                'required_if:role,faculty_staff',
                'nullable',
                'string',
                Rule::when(
                    ($input['role'] ?? null) === 'faculty_staff',
                    Rule::in(['teaching', 'non_teaching']),
                ),
            ],
            'department' => [
                'required_if:role,student,faculty_staff',
                'nullable',
                'string',
                'max:100',
                Rule::when(
                    ($input['role'] ?? null) === 'student',
                    Rule::in(['BSA', 'BAT', 'BSIT', 'BTLED']),
                ),
            ],
            // Students register with their email address only; no student ID
            // number or document is collected.
            'password' => $this->passwordRules(),
        ];

        if ($requireStudentDetails) {
            $rules['employee_id_number'] = ['required_if:role,faculty_staff', 'nullable', 'string', 'max:50', Rule::unique(User::class, 'employee_id_number')->ignore(User::where('email', $input['email'] ?? '')->whereIn('status', ['inactive', 'rejected'])->value('id'))];
            $rules['position'] = ['required_if:role,faculty_staff', 'nullable', 'string', 'max:255'];
            $rules['contact_no'] = ['required_if:role,faculty_staff', 'nullable', 'string', 'max:30'];
            $rules['employment_document'] = ['required_if:role,faculty_staff', 'nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'];
            $rules['educational_level'] = [
                'required_if:role,student',
                'nullable',
                'string',
                Rule::in(['college', 'senior_high', 'graduate']),
            ];
            $rules['year_level'] = [
                'required_if:role,student',
                'nullable',
                'string',
                Rule::in(['1', '2', '3', '4', '5']),
            ];
        }

        Validator::make($input, $rules)->validate();
    }

    /**
     * Keep the student profile fields that were collected during web
     * registration. Non-student accounts have no student profile.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    private function studentDetails(array $input): array
    {
        if (($input['role'] ?? null) !== 'student') {
            return [];
        }

        return [
            'educational_level' => $input['educational_level'] ?? null,
            'year_level' => $input['year_level'] ?? null,
        ];
    }

    /**
     * Remove a temporary employment document when registration cannot continue.
     *
     * @param  array<string, mixed>  $input
     */
    private function deleteEmploymentDocument(array $input): void
    {
        if (filled($input['employment_document_path'] ?? null)) {
            Storage::disk('local')->delete((string) $input['employment_document_path']);
        }
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    private function storeEmploymentDocument(array $input): array
    {
        $file = $input['employment_document'] ?? null;
        unset($input['employment_document']);

        if (($input['role'] ?? null) !== 'faculty_staff' || ! $file instanceof UploadedFile) {
            return $input;
        }

        $path = $file->storeAs('employment-documents', Str::uuid()->toString().'.'.$file->extension(), 'local');
        if (! is_string($path)) {
            throw ValidationException::withMessages(['employment_document' => 'We could not save your employment document. Please try again.']);
        }

        $input['employment_document_path'] = $path;
        $input['employment_document_original_name'] = basename($file->getClientOriginalName());

        return $input;
    }

    /**
     * Students never carry an employment type. Preserve the department or
     * office supplied by both teaching and non-teaching faculty.
     *
     * @param  array<string, string>  $input
     */
    private function applyEmploymentDefaults(array &$input): void
    {
        if (($input['role'] ?? null) !== 'faculty_staff') {
            $input['employment_type'] = null;

            return;
        }

    }

    /**
     * Limit how many verification codes can be requested for one address.
     */
    private function throttleOtpRequest(string $email): void
    {
        $key = 'registration-otp:'.Str::lower($email).'|'.request()->ip();

        if (RateLimiter::tooManyAttempts($key, 3)) {
            throw ValidationException::withMessages([
                'email' => 'Too many verification codes requested. Please wait a moment and try again.',
            ]);
        }

        RateLimiter::hit($key, 60);
    }
}
