<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\Role;
use App\Models\User;
use App\Services\BrevoMailService;
use App\Services\RegistrationOtpService;
use App\Services\StudentVerification\StudentVerificationService;
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
        private StudentVerificationService $documents,
    ) {}

    /**
     * Validate the registration request, stash any uploaded student
     * documents for the administrator to review, email a one-time code to
     * the applicant, and redirect to the OTP verification step. The
     * account itself is only created once the code has been confirmed.
     *
     * @param  array<string, mixed>  $input
     */
    public function create(array $input): User
    {
        $input = $this->withFullName($input);
        $this->validateInput($input, requireStudentDetails: true);

        $cor = $input['cor'] ?? null;
        unset($input['cor'], $input['student_id']);

        $email = (string) $input['email'];
        $this->throttleOtpRequest($email);

        $this->stashRegistrationUploads($email, $cor);

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

            throw ValidationException::withMessages([
                'email' => 'We could not send a verification code to your email address. Please try again.',
            ]);
        }

        session()->put('registration_otp_email', $email);

        throw new HttpResponseException(
            redirect()->route('register.otp.show'),
        );
    }

    /**
     * Create the user account once the emailed OTP has been verified.
     *
     * Accounts are registered with their verified email address but remain
     * unapproved: students stay pending until an ICT admin reviews their
     * uploaded Certificate of Registration, and faculty/staff stay pending
     * until an ICT admin approves the account.
     *
     * @param  array<string, mixed>  $input
     */
    public function createVerified(array $input): User
    {
        $this->applyEmploymentDefaults($input);

        $details = ($input['role'] ?? null) === 'student'
            ? $this->studentDetails($input)
            : [
                'position' => $input['position'] ?? null,
                'contact_no' => $input['contact_no'] ?? null,
            ];

        $user = DB::transaction(function () use ($input, $details) {
            $role = Role::where('role_name', $input['role'])->firstOrFail();

            $revived = User::where('email', $input['email'])
                ->whereIn('status', ['inactive', 'rejected'])
                ->first();

            $isFaculty = ($input['role'] ?? null) === 'faculty_staff';

            $attributes = [
                'name' => $input['name'],
                'email' => $input['email'],
                'password' => $input['password'],
                'role_id' => $role->id,
                'department' => $input['department'] ?? null,
                'employment_type' => $input['employment_type'] ?? null,
                'id_number' => $input['id_number'] ?? null,
                ...$details,
                'status' => 'active',
                'is_approved' => $isFaculty,
                'approval_status' => $isFaculty ? 'approved' : 'pending',
                'email_verified_at' => now(),
            ];

            if ($revived !== null) {
                $revived->update($attributes);

                return $revived->refresh();
            }

            return User::create($attributes);
        });

        $this->documents->adoptRegistrationUploads($user);

        return $user;
    }

    /**
     * Validate the registration input and create the account immediately,
     * skipping the email OTP step. Used by API clients that cannot complete
     * the browser-based verification flow.
     *
     * @param  array<string, mixed>  $input
     */
    public function createWithoutEmailVerification(array $input): User
    {
        $input = $this->withFullName($input);
        $this->validateInput($input, requireStudentDetails: false);

        $user = $this->createVerified($input);
        if ($user->isStudent()) {
            $user->forceFill(['email_verified_at' => null])->save();
        }

        return $user;
    }

    /**
     * Copy the COR of a pending registration onto the private disk so it
     * survives the OTP round-trip. A new pending
     * registration for the same address replaces any previous files.
     */
    private function stashRegistrationUploads(string $email, ?UploadedFile $cor): void
    {
        $directory = self::pendingUploadDirectory($email);
        Storage::disk('local')->deleteDirectory($directory);

        if ($cor === null) {
            return;
        }

        if ($cor->storeAs($directory, 'cor', 'local') === false) {
            throw ValidationException::withMessages([
                'cor' => 'Your documents could not be staged. Please try again.',
            ]);
        }
    }

    /**
     * The private-disk directory holding the documents of one pending
     * registration.
     */
    public static function pendingUploadDirectory(string $email): string
    {
        return 'student-verification-pending/'.sha1(Str::lower($email));
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
            ? Str::upper(rtrim((string) $parts['middle_initial'], '.')).'.'
            : null;
        $input['name'] = implode(' ', array_filter([
            trim((string) $parts['first_name']), $initial, trim((string) $parts['last_name']),
        ], fn ($part) => $part !== null));

        return $input;
    }

    /**
     * Validate the raw registration input.
     *
     * @param  array<string, mixed>  $input
     */
    private function validateInput(array $input, bool $requireStudentDetails = false): void
    {
        $returningUser = User::where('email', $input['email'] ?? '')
            ->whereIn('status', ['inactive', 'rejected'])
            ->first();

        $rules = [
            'name' => $this->nameRules(),
            'email' => [
                'required',
                'string',
                'email',
                'max:191',
                // Only campus email addresses may register. The host has to
                // be exactly ustp.edu.ph; other domains, look-alike
                // domains and sub-domains are all rejected.
                Rule::when(($input['role'] ?? null) !== 'student', 'regex:/^[^\s@]+@ustp\.edu\.ph$/i'),
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
                    Rule::in(array_keys(config('student-verification.programs'))),
                ),
            ],
            'password' => $this->passwordRules(),
            // Manually-reviewed evidence. Students upload their Certificate
            // of Registration with the registration form; a student ID
            // number is collected separately for manual administrator review.
            'cor' => [
                Rule::requiredIf($requireStudentDetails && ($input['role'] ?? null) === 'student'),
                'nullable',
                'file',
                'mimetypes:'.implode(',', config('student-verification.uploads.cor.accepted_mimes')),
                'max:'.config('student-verification.uploads.cor.max_kilobytes'),
            ],
            'student_id' => ['prohibited'],
            'id_number' => [
                Rule::requiredIf($requireStudentDetails),
                'nullable',
                'string',
                'max:20',
                Rule::when(
                    ($input['role'] ?? null) === 'student',
                    ['regex:/^[0-9]+$/'],
                    ['regex:/^[A-Za-z0-9-]+$/'],
                ),
                Rule::when(
                    ($input['role'] ?? null) === 'student',
                    Rule::unique('student_profiles', 'id_number')->ignore($returningUser?->id, 'user_id'),
                    Rule::unique('faculty_profiles', 'id_number')->ignore($returningUser?->id, 'user_id'),
                ),
            ],
        ];

        if ($requireStudentDetails) {
            $rules['terms'] = ['required', 'accepted'];
            $rules['position'] = ['required_if:role,faculty_staff', 'nullable', 'string', 'max:255'];
            $rules['contact_no'] = ['required_if:role,faculty_staff', 'nullable', 'string', 'max:30'];
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

        $validator = Validator::make($input, $rules, [
            'terms.accepted' => 'You must agree to the Terms of Service and Privacy Policy to continue.',
            'email.regex' => 'Registration is only open to email addresses ending in @ustp.edu.ph.',
            'cor.required' => 'Please upload your Certificate of Registration (COR)',
        ], [
            'cor' => 'Certificate of Registration',
            'id_number' => 'student ID number',
        ]);
        $validator->after(fn ($validator) => $this->validateUploadSignatures($validator, $input));
        $validator->validate();
    }

    /**
     * The uploaded file content must match its claimed document type;
     * client-reported MIME types are not trusted.
     *
     * @param  array<string, mixed>  $input
     */
    private function validateUploadSignatures(\Illuminate\Validation\Validator $validator, array $input): void
    {
        $file = $input['cor'] ?? null;

        if (! $file instanceof UploadedFile || ! $file->isValid()) {
            return;
        }

        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($file->getRealPath());

        if (! in_array($mime, (array) config('student-verification.uploads.cor.accepted_mimes'), true)) {
            $validator->errors()->add('cor', 'The uploaded file content is not a supported document.');
        }
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
     * Students never carry an employment type. Preserve the department or
     * office supplied by both teaching and non-teaching faculty.
     *
     * @param  array<string, mixed>  $input
     */
    private function applyEmploymentDefaults(array &$input): void
    {
        if (($input['role'] ?? null) !== 'faculty_staff') {
            $input['employment_type'] = null;
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
