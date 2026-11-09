<?php

namespace App\Models;

use App\Concerns\HasNormalizedAttributes;
// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Services\BrevoMailService;
use App\Services\StudentVerification\StudentVerificationService;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use PHPOpenSourceSaver\JWTAuth\Contracts\JWTSubject;
use RuntimeException;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property bool $is_approved
 * @property string|null $approval_status
 * @property string|null $avatar
 * @property string|null $department
 * @property string|null $id_number
 * @property string|null $employment_type
 * @property string|null $position
 * @property string|null $expertise
 * @property string|null $educational_level
 * @property string|null $year_level
 * @property string|null $gender
 * @property Carbon|null $birth_date
 * @property string|null $home_address
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property bool $is_technician
 */
#[Fillable(['name', 'email', 'password', 'role_id', 'department', 'employment_type', 'id_number', 'educational_level', 'year_level', 'gender', 'birth_date', 'home_address', 'contact_no', 'status', 'avatar', 'position', 'expertise', 'is_technician', 'is_approved', 'approval_status'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token', 'cor_path', 'employment_document_path', 'cor_verification_details'])]
class User extends Authenticatable implements JWTSubject
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasNormalizedAttributes, Notifiable;

    protected $with = ['role', 'studentProfile.program', 'facultyProfile.department'];

    protected $appends = ['is_approved'];

    protected static function booted(): void
    {
        static::saving(function (self $user): void {
            if ($user->isDirty('role_id')) {
                $user->unsetRelation('role');
            }
        });
        static::created(function (self $user): void {
            $user->setRelation('studentProfile', null);
            $user->setRelation('facultyProfile', null);
        });
    }

    protected function normalizedAttributeNames(): array
    {
        return ['department', 'id_number', 'educational_level', 'year_level', 'employment_type', 'position'];
    }

    protected function readNormalizedAttribute(string $key): mixed
    {
        return match ($key) {
            'department' => $this->isStudent() ? $this->studentProfile?->program?->code : $this->facultyProfile?->department?->name,
            'id_number', 'educational_level', 'year_level' => $this->studentProfile?->getAttribute($key),
            default => $this->facultyProfile?->getAttribute($key),
        };
    }

    protected function persistNormalizedAttributes(array $changes): void
    {
        $student = array_intersect_key($changes, array_flip(['id_number', 'educational_level', 'year_level']));
        $faculty = array_intersect_key($changes, array_flip(['employment_type', 'position']));
        if (array_key_exists('department', $changes)) {
            $name = $changes['department'];
            if ($this->isStudent()) {
                $student['program_id'] = filled($name)
                    ? Program::firstOrCreate(['code' => $name], ['name' => $name])->id : null;
            } else {
                $faculty['department_id'] = filled($name) ? Department::firstOrCreate(['name' => $name])->id : null;
            }
        }
        if ($student !== []) {
            $this->studentProfile()->updateOrCreate([], $student);
        }
        if ($faculty !== []) {
            $this->facultyProfile()->updateOrCreate([], $faculty);
        }
        $this->unsetRelation('studentProfile');
        $this->unsetRelation('facultyProfile');
        $this->load('studentProfile.program', 'facultyProfile.department');
    }

    /** @return HasOne<StudentProfile, $this> */
    public function studentProfile(): HasOne
    {
        return $this->hasOne(StudentProfile::class);
    }

    /** @return HasOne<FacultyProfile, $this> */
    public function facultyProfile(): HasOne
    {
        return $this->hasOne(FacultyProfile::class);
    }

    /** @return Attribute<bool, bool> */
    protected function isApproved(): Attribute
    {
        return Attribute::make(
            get: fn (): bool => $this->approval_status === 'approved',
            set: fn (bool $value): array => ['approval_status' => $value ? 'approved' : ($this->approval_status === 'rejected' ? 'rejected' : 'pending')],
        );
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'birth_date' => 'date',
            'password' => 'hashed',
            'is_technician' => 'boolean',
        ];
    }

    /**
     * Permanently remove the account and its uploaded documents.
     */
    public function purgeAccount(): void
    {
        $avatar = $this->getRawOriginal('avatar');

        if (filled($avatar)) {
            Storage::disk('public')->delete((string) $avatar);
        }

        if ($this->studentVerification !== null) {
            app(StudentVerificationService::class)->forget($this->studentVerification);
        }
        $this->delete();
    }

    /**
     * Resolve the public URL of the stored profile photo, or null when
     * the user has not uploaded one. The raw path stays in the database
     * so the file can be deleted with getRawOriginal('avatar').
     *
     * @return Attribute<string|null, never>
     */
    protected function avatar(): Attribute
    {
        return new Attribute(get: fn (?string $value): ?string => filled($value)
            ? Storage::disk('public')->url($value)
            : null);
    }

    /**
     * Email the password reset link through Brevo instead of the default
     * mailer, which is only configured to log messages in this app.
     *
     * A failure is reported and surfaced as a field error so the request
     * form can tell the user the link could not be sent.
     *
     * @param  string  $token
     */
    public function sendPasswordResetNotification(#[\SensitiveParameter] $token): void
    {
        $resetUrl = url(route('password.reset', [
            'token' => $token,
            'email' => $this->getEmailForPasswordReset(),
        ], false));

        $broker = (string) config('auth.defaults.passwords');
        $expiresInMinutes = (int) config("auth.passwords.{$broker}.expire", 60);

        try {
            app(BrevoMailService::class)->sendPasswordResetEmail(
                $this->getEmailForPasswordReset(),
                (string) $this->name,
                $resetUrl,
                $expiresInMinutes,
            );
        } catch (RuntimeException|ConnectionException $exception) {
            report($exception);

            throw ValidationException::withMessages([
                'email' => 'We could not send a password reset link. Please try again.',
            ]);
        }
    }

    /**
     * Technician records are personnel pinning data for job order assignments;
     * they are never issued login credentials.
     */
    public function isTechnician(): bool
    {
        return (bool) $this->is_technician;
    }

    /**
     * ICT Admins manage accounts and approvals; they are never gated by
     * the pending-approval workflow.
     */
    public function isAdministrator(): bool
    {
        return $this->role?->role_name === 'ict_admin';
    }

    /**
     * Students authenticate through the document-verification workflow and
     * are governed by their approval_status rather than is_approved.
     */
    public function isStudent(): bool
    {
        return $this->role?->role_name === 'student';
    }

    /**
     * The document-verification application of this student, if any.
     *
     * @return HasOne<StudentVerification, $this>
     */
    public function studentVerification(): HasOne
    {
        return $this->hasOne(StudentVerification::class);
    }

    /**
     * Get the role assigned to this user.
     *
     * @return BelongsTo<Role, $this>
     */
    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    /**
     * Get all service requests submitted by this user.
     *
     * @return HasMany<ServiceRequest, $this>
     */
    public function serviceRequests(): HasMany
    {
        return $this->hasMany(ServiceRequest::class);
    }

    /**
     * Get all job orders assigned to this user (as technician).
     *
     * @return HasMany<JobOrder, $this>
     */
    public function assignedJobOrders(): HasMany
    {
        return $this->hasMany(JobOrder::class, 'assigned_to');
    }

    /**
     * Get all bookings made by this user.
     *
     * @return HasMany<Booking, $this>
     */
    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    /**
     * Get all bookings this user has approved (as admin).
     *
     * @return HasMany<Booking, $this>
     */
    public function approvedBookings(): HasMany
    {
        return $this->hasMany(Booking::class, 'approved_by');
    }

    /**
     * Get all incidents reported by this user.
     *
     * @return HasMany<IncidentReport, $this>
     */
    public function incidentReports(): HasMany
    {
        return $this->hasMany(IncidentReport::class, 'reported_by');
    }

    /**
     * Get all liability records assigned to this user.
     *
     * @return HasMany<UserLiability, $this>
     */
    public function userLiabilities(): HasMany
    {
        return $this->hasMany(UserLiability::class);
    }

    /**
     * Get all system notifications for this user.
     * Named differently from notifications() to avoid conflicting
     * with Laravel's built-in Notifiable trait relationship.
     *
     * @return HasMany<Notification, $this>
     */
    public function systemNotifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    /**
     * Get all audit log entries created by this user (as admin).
     *
     * @return HasMany<AuditLog, $this>
     */
    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class, 'admin_user_id');
    }

    public function getJWTIdentifier(): int|string
    {
        return $this->getKey();
    }

    /** @return array<string, mixed> */
    public function getJWTCustomClaims(): array
    {
        return [];
    }
}
