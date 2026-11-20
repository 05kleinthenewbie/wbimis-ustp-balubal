import { Form, Head } from '@inertiajs/react';
import {
    ArrowRight,
    Check,
    GraduationCap,
    Mail,
    User,
    Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import FormErrorSummary from '@/components/form-error-summary';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import StatusAlert, { isAlertMessage } from '@/components/status-alert';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordStrength } from '@/components/ui/password-strength';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { privacy, terms } from '@/routes';
import { login as facultyLogin } from '@/routes/faculty';
import { store, validate as validateRegistration } from '@/routes/register';
import { login as studentLogin } from '@/routes/student';

type Props = {
    passwordRules: string;
    programs?: string[];
};

const fieldClassName =
    'h-11 w-full rounded-lg border-border bg-background text-sm transition-colors focus-visible:border-ustp-navy focus-visible:ring-ustp-navy/20';

function inputClassName(hasError: boolean): string {
    return `h-11 w-full rounded-lg bg-background text-sm transition-colors ${
        hasError
            ? 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20'
            : 'border-border focus-visible:border-ustp-navy focus-visible:ring-ustp-navy/20'
    }`;
}

function firstFieldError(value?: string | string[]): string | undefined {
    return Array.isArray(value) ? value[0] : value;
}
const labelClassName = 'text-sm font-medium text-foreground';
const detailsClassName =
    'flex min-w-0 flex-col items-stretch gap-4 rounded-2xl border border-border bg-muted/20 p-4 sm:p-6';
const defaultPrograms = ['BSA', 'BAT', 'BSIT', 'BTLED'];
const DRAFT_KEY = 'wbimis-register-draft';

type RegisterDraft = Record<string, string>;

function xsrfToken(): string {
    if (typeof document === 'undefined') {
        return '';
    }

    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : '';
}

function readDraft(): RegisterDraft {
    if (typeof window === 'undefined') {
        return {};
    }

    try {
        const stored = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? '{}');

        return stored && typeof stored === 'object' ? stored : {};
    } catch {
        return {};
    }
}

export default function Register({ passwordRules, programs }: Props) {
    const [draft] = useState<RegisterDraft>(() => readDraft());
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [role] = useState(() => {
        if (typeof window === 'undefined') {
            return 'faculty';
        }

        return new URLSearchParams(window.location.search).get('role') ===
            'student'
            ? 'student'
            : 'faculty';
    });
    const [employmentType, setEmploymentType] = useState(
        draft.employment_type ?? '',
    );
    const [department, setDepartment] = useState(draft.department ?? '');
    const [yearLevel, setYearLevel] = useState(draft.year_level ?? '');
    const [educationalLevel, setEducationalLevel] = useState(
        draft.educational_level || 'college',
    );
    const isStudent = role === 'student';
    const [step, setStep] = useState(1);
    const [stepError, setStepError] = useState<string | null>(null);
    const [isCheckingDetails, setIsCheckingDetails] = useState(false);
    const [availabilityErrors, setAvailabilityErrors] = useState<{
        email?: string;
        id_number?: string;
    }>({});

    const steps = isStudent
        ? ['Account details', 'Academic information', 'Account security']
        : ['Account details', 'Employment information', 'Account security'];

    const stepFieldGroups: Record<number, string[]> = {
        1: [
            'first_name',
            'last_name',
            'middle_initial',
            'id_number',
            'email',
            'role',
        ],
        2: isStudent
            ? ['department', 'year_level', 'educational_level', 'cor']
            : ['employment_type', 'department', 'position', 'contact_no'],
        3: ['password', 'password_confirmation', 'terms'],
    };

    function stepForField(field: string): number {
        const match = Object.entries(stepFieldGroups).find(([, fields]) =>
            fields.includes(field),
        );

        return match ? Number(match[0]) : 1;
    }

    async function validateCurrentStep(): Promise<boolean> {
        setStepError(null);
        setAvailabilityErrors({});

        const container = document.getElementById(`register-step-${step}`);

        if (!container) {
            return true;
        }

        const emailInput = container.querySelector<HTMLInputElement>(
            'input[name="email"]',
        );

        if (emailInput) {
            const email = emailInput.value.trim();

            if (email === '') {
                setAvailabilityErrors({
                    email: 'Enter your email address.',
                });
                emailInput.focus();

                return false;
            }

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                setAvailabilityErrors({
                    email: 'Enter a valid email address.',
                });
                emailInput.focus();

                return false;
            }

            if (!isStudent && !/@ustp\.edu\.ph$/i.test(email)) {
                setAvailabilityErrors({
                    email: 'Use your @ustp.edu.ph email address.',
                });
                emailInput.focus();

                return false;
            }
        }

        const idInput = isStudent
            ? container.querySelector<HTMLInputElement>(
                  'input[name="id_number"]',
              )
            : null;

        if (idInput) {
            const idNumber = idInput.value.trim();

            if (idNumber === '') {
                setAvailabilityErrors({
                    id_number: 'Enter your student ID number.',
                });
                idInput.focus();

                return false;
            }

            if (!/^[0-9]+$/.test(idNumber)) {
                setAvailabilityErrors({
                    id_number: 'Use numbers only for your student ID number.',
                });
                idInput.focus();

                return false;
            }

            if (idNumber.length !== 10) {
                setAvailabilityErrors({
                    id_number: 'Student ID number must be exactly 10 digits.',
                });
                idInput.focus();

                return false;
            }
        }

        const fields = Array.from(
            container.querySelectorAll<
                HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
            >('input, select, textarea'),
        ).filter((field) => field.required);

        const invalid = fields.find((field) => !field.checkValidity());

        if (invalid) {
            setStepError('Complete the required fields before continuing.');
            invalid.reportValidity();

            return false;
        }

        if (step !== 1 || !emailInput) {
            return true;
        }

        setIsCheckingDetails(true);

        try {
            const response = await fetch(validateRegistration.url(), {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': xsrfToken(),
                },
                body: JSON.stringify({
                    email: emailInput.value.trim(),
                    id_number: idInput?.value.trim() ?? null,
                    role,
                }),
            });

            const payload = (await response.json().catch(() => ({}))) as {
                errors?: Record<string, string | string[]>;
                message?: string;
            };

            const firstEmailError = firstFieldError(payload.errors?.email);
            const firstIdError = firstFieldError(payload.errors?.id_number);

            if (firstEmailError || firstIdError) {
                setAvailabilityErrors({
                    email: firstEmailError,
                    id_number: firstIdError,
                });

                if (firstEmailError) {
                    emailInput.focus();
                } else {
                    idInput?.focus();
                }

                return false;
            }

            if (!response.ok) {
                const validationErrors = Object.values(
                    payload.errors ?? {},
                ).flatMap((message) =>
                    Array.isArray(message) ? message : [message],
                );

                setStepError(
                    validationErrors[0] ??
                        payload.message ??
                        'We could not validate your details. Please try again.',
                );

                return false;
            }
        } catch {
            setStepError(
                'We could not validate your details. Check your connection and try again.',
            );

            return false;
        } finally {
            setIsCheckingDetails(false);
        }

        return true;
    }

    async function goToNextStep() {
        if (!(await validateCurrentStep())) {
            return;
        }

        setStep((current) => Math.min(current + 1, steps.length));
    }

    useEffect(() => {
        const form = document.getElementById(
            'register-form',
        ) as HTMLFormElement | null;

        if (!form) {
            return;
        }

        const persist = () => {
            const data: RegisterDraft = {};

            new FormData(form).forEach((value, key) => {
                if (
                    key === 'password' ||
                    key === 'password_confirmation' ||
                    key === 'cor'
                ) {
                    return;
                }

                if (typeof value === 'string' && value !== '') {
                    data[key] = value;
                }
            });

            try {
                sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data));
            } catch {
                // Ignore storage errors (private mode, quota).
            }
        };

        form.addEventListener('input', persist);
        form.addEventListener('change', persist);

        return () => {
            form.removeEventListener('input', persist);
            form.removeEventListener('change', persist);
        };
    }, []);

    return (
        <>
            <Head
                title={
                    isStudent ? 'Student Registration' : 'Faculty Registration'
                }
            />
            <Form
                {...store.form()}
                id="register-form"
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                onError={(errors) => {
                    const firstError = Object.keys(errors)[0];

                    if (firstError) {
                        setStepError(null);
                        setStep(stepForField(firstError));
                    }
                }}
                className="flex flex-col gap-8"
            >
                {({ processing, errors }) => (
                    <>
                        <ol
                            className="grid grid-cols-3 gap-2"
                            aria-label="Registration progress"
                        >
                            {steps.map((label, index) => {
                                const number = index + 1;
                                const complete = step > number;
                                const current = step === number;

                                return (
                                    <li key={label}>
                                        <button
                                            type="button"
                                            disabled={!complete}
                                            onClick={() => {
                                                setStepError(null);
                                                setStep(number);
                                            }}
                                            className="w-full text-left disabled:cursor-default"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                                                        complete
                                                            ? 'border-emerald-500 bg-emerald-500 text-white'
                                                            : current
                                                              ? 'border-ustp-gold bg-ustp-gold text-ustp-navy'
                                                              : 'border-slate-200 bg-white text-slate-400'
                                                    }`}
                                                >
                                                    {complete ? (
                                                        <Check className="size-3.5" />
                                                    ) : (
                                                        number
                                                    )}
                                                </span>
                                                <span
                                                    className={`truncate text-[11px] font-medium ${
                                                        complete || current
                                                            ? 'text-slate-700'
                                                            : 'text-slate-400'
                                                    }`}
                                                >
                                                    {label}
                                                </span>
                                            </div>
                                            <div
                                                className={`mt-2 h-1 rounded-full ${
                                                    complete || current
                                                        ? 'bg-ustp-gold'
                                                        : 'bg-slate-200'
                                                }`}
                                            />
                                        </button>
                                    </li>
                                );
                            })}
                        </ol>

                        {Object.keys(errors).some(
                            (field) => stepForField(field) < step,
                        ) && (
                            <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 sm:flex-row sm:items-center sm:justify-between">
                                <p>
                                    Some fields in an earlier step need
                                    attention.
                                </p>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                        setStep(
                                            Math.min(
                                                ...Object.keys(errors).map(
                                                    (field) =>
                                                        stepForField(field),
                                                ),
                                            ),
                                        )
                                    }
                                    className="h-9 border-amber-300 bg-white text-amber-800 hover:bg-amber-100 hover:text-amber-900"
                                >
                                    Review earlier step
                                </Button>
                            </div>
                        )}

                        <FormErrorSummary
                            errors={Object.fromEntries(
                                Object.entries(errors).filter(
                                    ([field]) => stepForField(field) === step,
                                ),
                            )}
                            labels={{
                                name: 'Full name',
                                first_name: 'First name',
                                middle_initial: 'Middle initial',
                                last_name: 'Last name',
                                id_number: isStudent
                                    ? 'Student ID number'
                                    : 'Employee ID number',
                                email: 'Email address',
                                department: isStudent
                                    ? 'Program'
                                    : 'Department',
                                employment_type: 'Employment type',
                                position: 'Position',
                                contact_no: 'Contact number',
                                educational_level: 'Educational level',
                                year_level: 'Year level',
                                password: 'Password',
                                password_confirmation: 'Confirm password',
                                terms: 'Terms and Privacy Policy',
                                cor: 'Certificate of Registration',
                            }}
                        />
                        <input type="hidden" name="role" value={role} />
                        <div
                            id="register-step-1"
                            className={
                                step === 1 ? 'flex flex-col gap-6' : 'hidden'
                            }
                        >
                            <section
                                className="grid items-start gap-4"
                                aria-labelledby="account-details"
                            >
                                <div className="space-y-1 border-b border-border pb-4 sm:col-span-2">
                                    <h3
                                        id="account-details"
                                        className="font-semibold text-foreground"
                                    >
                                        Account details
                                    </h3>
                                </div>
                                <div className="grid gap-3 sm:col-span-2">
                                    {[
                                        {
                                            name: 'first_name',
                                            label: 'First name',
                                            autoComplete: 'given-name',
                                            placeholder: 'First name',
                                        },
                                        {
                                            name: 'last_name',
                                            label: 'Last name',
                                            autoComplete: 'family-name',
                                            placeholder: 'Last name',
                                        },
                                        {
                                            name: 'middle_initial',
                                            label: 'MI (optional)',
                                            autoComplete: 'additional-name',
                                            placeholder: 'MI',
                                        },
                                    ].map((field) => (
                                        <div
                                            key={field.name}
                                            className="flex flex-col gap-2"
                                        >
                                            <Label
                                                htmlFor={field.name}
                                                className={labelClassName}
                                            >
                                                {field.label}
                                            </Label>
                                            <div className="relative">
                                                <User className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                                <Input
                                                    id={field.name}
                                                    name={field.name}
                                                    defaultValue={
                                                        draft[field.name] ?? ''
                                                    }
                                                    required={
                                                        field.name !==
                                                        'middle_initial'
                                                    }
                                                    autoFocus={
                                                        field.name ===
                                                        'first_name'
                                                    }
                                                    autoComplete={
                                                        field.autoComplete
                                                    }
                                                    placeholder={
                                                        field.placeholder
                                                    }
                                                    maxLength={
                                                        field.name ===
                                                        'middle_initial'
                                                            ? 2
                                                            : 100
                                                    }
                                                    aria-invalid={Boolean(
                                                        errors[field.name],
                                                    )}
                                                    className={`${fieldClassName} pl-9`}
                                                />
                                            </div>
                                            <InputError
                                                message={errors[field.name]}
                                            />
                                        </div>
                                    ))}
                                    <InputError message={errors.name} />
                                </div>
                                <div className="grid content-start gap-2 sm:col-span-2">
                                    <Label
                                        htmlFor="id_number"
                                        className={labelClassName}
                                    >
                                        {isStudent
                                            ? 'Student ID number'
                                            : 'Employee ID number'}
                                    </Label>
                                    <Input
                                        id="id_number"
                                        name="id_number"
                                        defaultValue={draft.id_number ?? ''}
                                        type="text"
                                        inputMode={
                                            isStudent ? 'numeric' : 'text'
                                        }
                                        pattern={
                                            isStudent
                                                ? '[0-9]{10}'
                                                : '[A-Za-z0-9-]{1,20}'
                                        }
                                        maxLength={isStudent ? 10 : 20}
                                        required
                                        placeholder={
                                            isStudent
                                                ? '10-digit student ID number'
                                                : 'Employee ID number'
                                        }
                                        aria-invalid={
                                            Boolean(errors.id_number) ||
                                            Boolean(
                                                availabilityErrors.id_number,
                                            )
                                        }
                                        onChange={() =>
                                            setAvailabilityErrors(
                                                (current) => ({
                                                    ...current,
                                                    id_number: undefined,
                                                }),
                                            )
                                        }
                                        className={inputClassName(
                                            Boolean(errors.id_number) ||
                                                Boolean(
                                                    availabilityErrors.id_number,
                                                ),
                                        )}
                                    />
                                    {availabilityErrors.id_number ? (
                                        <p
                                            role="alert"
                                            className="text-xs font-medium text-red-600"
                                        >
                                            {availabilityErrors.id_number}
                                        </p>
                                    ) : (
                                        <InputError
                                            message={errors.id_number}
                                        />
                                    )}
                                </div>
                                <div className="grid content-start gap-2 sm:col-span-2">
                                    <Label
                                        htmlFor="email"
                                        className={labelClassName}
                                    >
                                        Email address
                                    </Label>
                                    <div className="relative">
                                        <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            type="email"
                                            name="email"
                                            defaultValue={draft.email ?? ''}
                                            required
                                            autoComplete="email"
                                            placeholder={
                                                isStudent
                                                    ? 'name@example.com'
                                                    : 'name@ustp.edu.ph'
                                            }
                                            aria-invalid={
                                                Boolean(errors.email) ||
                                                Boolean(
                                                    availabilityErrors.email,
                                                )
                                            }
                                            onChange={() =>
                                                setAvailabilityErrors(
                                                    (current) => ({
                                                        ...current,
                                                        email: undefined,
                                                    }),
                                                )
                                            }
                                            className={`${inputClassName(
                                                Boolean(errors.email) ||
                                                    Boolean(
                                                        availabilityErrors.email,
                                                    ),
                                            )} pl-9`}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {isStudent
                                            ? 'Personal or university email.'
                                            : 'Use your @ustp.edu.ph email.'}
                                    </p>
                                    {availabilityErrors.email ? (
                                        <p
                                            role="alert"
                                            className="text-xs font-medium text-red-600"
                                        >
                                            {availabilityErrors.email}
                                        </p>
                                    ) : isAlertMessage(errors.email ?? '') ? (
                                        <StatusAlert message={errors.email} />
                                    ) : (
                                        <InputError message={errors.email} />
                                    )}
                                </div>
                                <InputError message={errors.role} />
                            </section>
                        </div>

                        <div
                            id="register-step-2"
                            className={
                                step === 2 ? 'flex flex-col gap-6' : 'hidden'
                            }
                        >
                            <section
                                className={detailsClassName}
                                aria-labelledby="profile-details"
                            >
                                <h3
                                    id="profile-details"
                                    className="font-semibold text-foreground sm:col-span-2"
                                >
                                    {isStudent
                                        ? 'Academic information'
                                        : 'Employment information'}
                                </h3>
                                {isStudent ? (
                                    <>
                                        <div className="flex flex-col gap-2">
                                            <Label
                                                htmlFor="department"
                                                className={labelClassName}
                                            >
                                                Program
                                            </Label>
                                            <Select
                                                name="department"
                                                value={department}
                                                onValueChange={setDepartment}
                                                required
                                            >
                                                <SelectTrigger
                                                    id="department"
                                                    className={fieldClassName}
                                                    aria-invalid={Boolean(
                                                        errors.department,
                                                    )}
                                                >
                                                    <SelectValue placeholder="Select program" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {(
                                                        programs ??
                                                        defaultPrograms
                                                    ).map((program) => (
                                                        <SelectItem
                                                            key={program}
                                                            value={program}
                                                        >
                                                            {program}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <InputError
                                                message={errors.department}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <Label
                                                htmlFor="year_level"
                                                className={labelClassName}
                                            >
                                                Year level
                                            </Label>
                                            <Select
                                                name="year_level"
                                                value={yearLevel}
                                                onValueChange={(value) => {
                                                    setYearLevel(
                                                        value === '0'
                                                            ? '1'
                                                            : value,
                                                    );
                                                    setEducationalLevel(
                                                        value === '0'
                                                            ? 'senior_high'
                                                            : 'college',
                                                    );
                                                }}
                                                required
                                            >
                                                <SelectTrigger
                                                    id="year_level"
                                                    className={fieldClassName}
                                                    aria-invalid={Boolean(
                                                        errors.year_level,
                                                    )}
                                                >
                                                    <SelectValue placeholder="Select year level" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="0">
                                                        Senior High
                                                    </SelectItem>
                                                    {[
                                                        '1',
                                                        '2',
                                                        '3',
                                                        '4',
                                                        '5',
                                                    ].map((year) => (
                                                        <SelectItem
                                                            key={year}
                                                            value={year}
                                                        >
                                                            {year}
                                                            {year === '1'
                                                                ? 'st'
                                                                : year === '2'
                                                                  ? 'nd'
                                                                  : year === '3'
                                                                    ? 'rd'
                                                                    : 'th'}{' '}
                                                            Year
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <input
                                                type="hidden"
                                                name="educational_level"
                                                value={educationalLevel}
                                            />
                                            <InputError
                                                message={errors.year_level}
                                            />
                                            <InputError
                                                message={
                                                    errors.educational_level
                                                }
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex flex-col gap-2">
                                            <Label
                                                htmlFor="employment_type"
                                                className={labelClassName}
                                            >
                                                Employment type
                                            </Label>
                                            <Select
                                                name="employment_type"
                                                value={employmentType}
                                                onValueChange={(value) => {
                                                    setEmploymentType(value);
                                                    setDepartment('');
                                                }}
                                                required
                                            >
                                                <SelectTrigger
                                                    id="employment_type"
                                                    className={fieldClassName}
                                                    aria-invalid={Boolean(
                                                        errors.employment_type,
                                                    )}
                                                >
                                                    <SelectValue placeholder="Select employment type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="teaching">
                                                        Teaching
                                                    </SelectItem>
                                                    <SelectItem value="non_teaching">
                                                        Non-teaching
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <InputError
                                                message={errors.employment_type}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <Label
                                                htmlFor="department"
                                                className={labelClassName}
                                            >
                                                Department
                                            </Label>
                                            <Input
                                                id="department"
                                                name="department"
                                                value={department}
                                                onChange={(event) =>
                                                    setDepartment(
                                                        event.target.value,
                                                    )
                                                }
                                                required
                                                maxLength={100}
                                                placeholder="Department or office"
                                                aria-invalid={Boolean(
                                                    errors.department,
                                                )}
                                                className={fieldClassName}
                                            />
                                            <InputError
                                                message={errors.department}
                                            />
                                        </div>
                                        {[
                                            {
                                                name: 'position',
                                                label: 'Position',
                                                placeholder:
                                                    'e.g. Instructor I',
                                            },
                                            {
                                                name: 'contact_no',
                                                label: 'Contact number',
                                                placeholder: 'e.g. 09123456789',
                                            },
                                        ].map((field) => (
                                            <div
                                                key={field.name}
                                                className="flex flex-col gap-2"
                                            >
                                                <Label
                                                    htmlFor={field.name}
                                                    className={labelClassName}
                                                >
                                                    {field.label}
                                                </Label>
                                                <Input
                                                    id={field.name}
                                                    name={field.name}
                                                    type={
                                                        field.name ===
                                                        'contact_no'
                                                            ? 'tel'
                                                            : 'text'
                                                    }
                                                    required
                                                    maxLength={
                                                        field.name ===
                                                        'contact_no'
                                                            ? 30
                                                            : 255
                                                    }
                                                    placeholder={
                                                        field.placeholder
                                                    }
                                                    aria-invalid={Boolean(
                                                        errors[field.name],
                                                    )}
                                                    className={fieldClassName}
                                                />
                                                <InputError
                                                    message={errors[field.name]}
                                                />
                                            </div>
                                        ))}
                                    </>
                                )}
                            </section>

                            {isStudent && (
                                <section
                                    className={detailsClassName}
                                    aria-labelledby="enrollment-documents"
                                >
                                    <div className="space-y-1 sm:col-span-2">
                                        <h3
                                            id="enrollment-documents"
                                            className="font-semibold text-foreground"
                                        >
                                            Enrollment details
                                        </h3>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Label
                                            htmlFor="cor"
                                            className={labelClassName}
                                        >
                                            COR (PDF, PNG, or JPEG)
                                        </Label>
                                        <Input
                                            id="cor"
                                            name="cor"
                                            type="file"
                                            accept=".pdf,.png,.jpg,.jpeg,.webp"
                                            required
                                            aria-invalid={Boolean(errors.cor)}
                                            className={fieldClassName}
                                        />
                                        <InputError message={errors.cor} />
                                    </div>
                                </section>
                            )}
                        </div>

                        <div
                            id="register-step-3"
                            className={
                                step === 3 ? 'flex flex-col gap-6' : 'hidden'
                            }
                        >
                            <section
                                className="flex flex-col items-stretch gap-4"
                                aria-labelledby="account-security"
                            >
                                <div className="space-y-1 border-b border-border pb-4 sm:col-span-2">
                                    <h3
                                        id="account-security"
                                        className="font-semibold text-foreground"
                                    >
                                        Secure your account
                                    </h3>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Label
                                        htmlFor="password"
                                        className={labelClassName}
                                    >
                                        Password
                                    </Label>
                                    <PasswordInput
                                        id="password"
                                        name="password"
                                        required
                                        autoComplete="new-password"
                                        value={password}
                                        onChange={(event) =>
                                            setPassword(event.target.value)
                                        }
                                        placeholder="Create a strong password"
                                        passwordrules={passwordRules}
                                        aria-invalid={Boolean(errors.password)}
                                        className={fieldClassName}
                                    />
                                    <InputError message={errors.password} />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Label
                                        htmlFor="password_confirmation"
                                        className={labelClassName}
                                    >
                                        Confirm password
                                    </Label>
                                    <PasswordInput
                                        id="password_confirmation"
                                        name="password_confirmation"
                                        required
                                        autoComplete="new-password"
                                        value={passwordConfirmation}
                                        onChange={(event) =>
                                            setPasswordConfirmation(
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Confirm your password"
                                        passwordrules={passwordRules}
                                        aria-invalid={Boolean(
                                            errors.password_confirmation,
                                        )}
                                        className={fieldClassName}
                                    />
                                    <InputError
                                        message={errors.password_confirmation}
                                    />
                                </div>
                                <PasswordStrength
                                    value={password}
                                    confirmation={passwordConfirmation}
                                    className="mt-1"
                                />
                            </section>

                            <div className="grid gap-2">
                                <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-4">
                                    <input
                                        type="checkbox"
                                        id="terms"
                                        name="terms"
                                        value="on"
                                        defaultChecked={draft.terms === 'on'}
                                        required
                                        aria-invalid={Boolean(errors.terms)}
                                        className="mt-0.5 size-4 shrink-0 rounded-[4px] border border-input accent-ustp-navy focus-visible:ring-2 focus-visible:ring-ustp-navy/30 dark:border-white/20"
                                    />
                                    <Label
                                        htmlFor="terms"
                                        className="block text-sm leading-relaxed font-normal text-muted-foreground"
                                    >
                                        I agree to the{' '}
                                        <a
                                            href={terms.url()}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="font-medium text-ustp-navy underline-offset-2 hover:underline dark:text-white/90"
                                        >
                                            Terms of Service
                                        </a>{' '}
                                        and{' '}
                                        <a
                                            href={privacy.url()}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="font-medium text-ustp-navy underline-offset-2 hover:underline dark:text-white/90"
                                        >
                                            Privacy Policy
                                        </a>
                                        .
                                    </Label>
                                </div>
                                <InputError message={errors.terms} />
                            </div>
                        </div>

                        {stepError && (
                            <p
                                role="alert"
                                className="text-xs font-medium text-red-600"
                            >
                                {stepError}
                            </p>
                        )}

                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                            {step > 1 ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setStepError(null);
                                        setStep((current) =>
                                            Math.max(1, current - 1),
                                        );
                                    }}
                                    className="h-11 w-full sm:w-auto"
                                >
                                    Back
                                </Button>
                            ) : (
                                <span />
                            )}

                            {step < steps.length ? (
                                <Button
                                    type="button"
                                    onClick={goToNextStep}
                                    disabled={isCheckingDetails}
                                    className="h-11 w-full bg-ustp-gold text-sm font-semibold text-ustp-navy hover:bg-ustp-gold-dark hover:text-white sm:w-auto"
                                >
                                    {isCheckingDetails ? (
                                        <>
                                            <Spinner />
                                            Checking details
                                        </>
                                    ) : (
                                        <>
                                            Continue
                                            <ArrowRight className="size-4" />
                                        </>
                                    )}
                                </Button>
                            ) : (
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    data-test="register-user-button"
                                    className="h-11 w-full bg-ustp-gold text-sm font-semibold text-ustp-navy hover:bg-ustp-gold-dark hover:text-white sm:w-auto"
                                >
                                    {processing && <Spinner />}
                                    {processing
                                        ? 'Sending code...'
                                        : 'Send verification code'}
                                    {!processing && (
                                        <ArrowRight className="size-4" />
                                    )}
                                </Button>
                            )}
                        </div>
                        {step === steps.length && (
                            <div className="border-t border-border pt-5 text-center text-sm leading-relaxed text-muted-foreground">
                                Already have an account?{' '}
                                <TextLink
                                    href={
                                        isStudent
                                            ? studentLogin()
                                            : facultyLogin()
                                    }
                                    data-test="team-invitation-login-link"
                                    className="font-medium text-ustp-navy hover:text-ustp-navy-dark dark:text-white/80 dark:hover:text-white"
                                >
                                    Sign in
                                </TextLink>
                            </div>
                        )}
                    </>
                )}
            </Form>
        </>
    );
}

Register.layout = () => {
    const isStudent =
        typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get('role') === 'student';

    return {
        wide: true,
        title: 'Create an account',
        icon: isStudent ? GraduationCap : Users,
        iconClassName: isStudent
            ? 'bg-green-100 text-green-600 dark:bg-green-950/60 dark:text-green-400'
            : 'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400',
    };
};
