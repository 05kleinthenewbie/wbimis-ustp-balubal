import { Form, Head } from '@inertiajs/react';
import { GraduationCap, Mail, User } from 'lucide-react';
import { useState } from 'react';
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
import { login, privacy, terms } from '@/routes';
import { store } from '@/routes/register';
import { login as studentLogin } from '@/routes/student';

type Props = {
    passwordRules: string;
    programs?: string[];
};

const defaultDepartmentOptions = [
    { value: 'BSA', label: 'BSA' },
    { value: 'BAT', label: 'BAT' },
    { value: 'BSIT', label: 'BSIT' },
    { value: 'BTLED', label: 'BTLED' },
];

export default function Register({ passwordRules, programs }: Props) {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [middleInitial, setMiddleInitial] = useState('');
    const [password, setPassword] = useState('');
    const [role] = useState(() => {
        if (typeof window === 'undefined') {
            return 'faculty_staff';
        }

        return new URLSearchParams(window.location.search).get('role') ===
            'student'
            ? 'student'
            : 'faculty_staff';
    });
    const [employmentType, setEmploymentType] = useState('');
    const [department, setDepartment] = useState('');
    const [yearLevel, setYearLevel] = useState('');
    const [educationalLevel, setEducationalLevel] = useState('college');
    const isStudent = role === 'student';

    return (
        <>
            <Head title={isStudent ? 'Student Registration' : 'Register'} />
            <Form
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className={
                    isStudent ? 'flex flex-col gap-5' : 'flex flex-col gap-6'
                }
            >
                {({ processing, errors }) => (
                    <>
                        <div
                            className={
                                isStudent
                                    ? 'grid gap-2'
                                    : 'grid items-start gap-x-6 gap-y-5 sm:grid-cols-2'
                            }
                        >
                            {!isStudent && (
                                <div className="space-y-1 border-b border-border pb-4 sm:col-span-2">
                                    <h3 className="font-semibold text-foreground">
                                        Account details
                                    </h3>
                                </div>
                            )}

                            {isStudent ? (
                                <>
                                    <div className="grid content-start gap-2">
                                        <Label
                                            htmlFor="full_name"
                                            className="text-sm font-medium text-foreground"
                                        >
                                            Full Name
                                        </Label>
                                        <Input
                                            id="full_name"
                                            name="name"
                                            required
                                            autoFocus
                                            autoComplete="name"
                                            placeholder="Enter your full name"
                                            maxLength={255}
                                            className="h-11 rounded-lg border-border text-sm transition-all focus-visible:border-ustp-navy focus-visible:ring-ustp-navy/20"
                                        />
                                        <InputError message={errors.name} />
                                    </div>
                                    <input
                                        type="hidden"
                                        name="role"
                                        value="student"
                                    />
                                    <div className="grid content-start gap-2">
                                        <Label
                                            htmlFor="email"
                                            className="text-sm font-medium text-foreground"
                                        >
                                            Email Address
                                        </Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            required
                                            autoComplete="email"
                                            name="email"
                                            placeholder="example@gmail.com"
                                            className="h-11 rounded-lg border-border text-sm transition-all focus-visible:border-ustp-navy focus-visible:ring-ustp-navy/20"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Personal or university email is
                                            accepted. After email verification,
                                            sign in to upload your USTP student
                                            ID and COR for administrator
                                            approval.
                                        </p>
                                        {isAlertMessage(errors.email ?? '') ? (
                                            <StatusAlert
                                                message={errors.email}
                                            />
                                        ) : (
                                            <InputError
                                                message={errors.email}
                                            />
                                        )}
                                    </div>
                                    <div className="grid content-start gap-2">
                                        <Label
                                            htmlFor="department"
                                            className="text-sm font-medium text-foreground"
                                        >
                                            Course / Program
                                        </Label>
                                        <Select
                                            name="department"
                                            value={department}
                                            onValueChange={setDepartment}
                                            required
                                        >
                                            <SelectTrigger
                                                id="department"
                                                className="h-11 w-full rounded-lg border-border text-sm transition-all focus-visible:border-ustp-navy focus-visible:ring-ustp-navy/20"
                                            >
                                                <SelectValue placeholder="Select your course or program" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(
                                                    programs ??
                                                    defaultDepartmentOptions.map(
                                                        ({ value }) => value,
                                                    )
                                                ).map((option) => (
                                                    <SelectItem
                                                        key={option}
                                                        value={option}
                                                    >
                                                        {option}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError
                                            message={errors.department}
                                        />
                                    </div>
                                    <div className="grid content-start gap-2">
                                        <Label
                                            htmlFor="year_level"
                                            className="text-sm font-medium text-foreground"
                                        >
                                            Year Level
                                        </Label>
                                        <Select
                                            name="year_level"
                                            value={yearLevel}
                                            onValueChange={(value) => {
                                                setYearLevel(
                                                    value === '0' ? '1' : value,
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
                                                className="h-11 w-full rounded-lg border-border text-sm transition-all focus-visible:border-ustp-navy focus-visible:ring-ustp-navy/20"
                                            >
                                                <SelectValue placeholder="Select your year level" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="0">
                                                    Senior High
                                                </SelectItem>
                                                {['1', '2', '3', '4', '5'].map(
                                                    (year) => (
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
                                                    ),
                                                )}
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
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="grid gap-4 sm:col-span-2">
                                        {[
                                            {
                                                field: 'first_name',
                                                label: 'First Name',
                                                value: firstName,
                                                set: setFirstName,
                                                complete: 'given-name',
                                            },
                                            {
                                                field: 'last_name',
                                                label: 'Last Name',
                                                value: lastName,
                                                set: setLastName,
                                                complete: 'family-name',
                                            },
                                            {
                                                field: 'middle_initial',
                                                label: 'MI (optional)',
                                                value: middleInitial,
                                                set: setMiddleInitial,
                                                complete: 'additional-name',
                                            },
                                        ].map(
                                            ({
                                                field,
                                                label,
                                                value,
                                                set,
                                                complete,
                                            }) => (
                                                <div
                                                    key={field}
                                                    className="grid gap-2"
                                                >
                                                    <Label htmlFor={field}>
                                                        {label}
                                                    </Label>
                                                    <div className="relative">
                                                        <User className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                                        <Input
                                                            id={field}
                                                            name={field}
                                                            value={value}
                                                            onChange={(event) =>
                                                                set(
                                                                    event.target
                                                                        .value,
                                                                )
                                                            }
                                                            required={
                                                                field !==
                                                                'middle_initial'
                                                            }
                                                            autoFocus={
                                                                field ===
                                                                'first_name'
                                                            }
                                                            autoComplete={
                                                                complete
                                                            }
                                                            maxLength={
                                                                field ===
                                                                'middle_initial'
                                                                    ? 2
                                                                    : 100
                                                            }
                                                            className="h-11 rounded-lg border-border pl-9 text-sm"
                                                        />
                                                    </div>
                                                    <InputError
                                                        message={errors[field]}
                                                    />
                                                </div>
                                            ),
                                        )}
                                        <InputError message={errors.name} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="email"
                                            className="text-sm font-medium text-foreground"
                                        >
                                            Email address
                                        </Label>
                                        <div className="relative">
                                            <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                id="email"
                                                type="email"
                                                required
                                                autoComplete="email"
                                                name="email"
                                                placeholder="your.email@example.com"
                                                className="h-11 rounded-lg border-border pl-9 text-sm transition-colors focus-visible:border-ustp-navy focus-visible:ring-ustp-navy/20"
                                            />
                                        </div>
                                        {isAlertMessage(errors.email ?? '') ? (
                                            <StatusAlert
                                                message={errors.email}
                                                className="mt-1.5"
                                            />
                                        ) : (
                                            <InputError
                                                message={errors.email}
                                            />
                                        )}
                                    </div>
                                    <input
                                        type="hidden"
                                        name="role"
                                        value={role}
                                    />
                                    {errors.role && (
                                        <div className="sm:col-span-2">
                                            <InputError message={errors.role} />
                                        </div>
                                    )}
                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="employment_type"
                                            className="text-sm font-medium text-foreground"
                                        >
                                            Employment type
                                            <span className="ml-1 text-destructive">
                                                *
                                            </span>
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
                                                className="h-11 w-full rounded-lg border-border text-sm transition-colors focus-visible:border-ustp-navy focus-visible:ring-ustp-navy/20"
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
                                    <div className="grid min-w-0 items-start gap-x-6 gap-y-5 rounded-2xl border border-border bg-muted/20 p-3 sm:col-span-2 sm:grid-cols-2 sm:p-6">
                                        <div className="space-y-1 sm:col-span-2">
                                            <h3 className="font-semibold text-foreground">
                                                Employment information
                                            </h3>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="department">
                                                Department
                                                <span className="ml-1 text-destructive">
                                                    *
                                                </span>
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
                                                placeholder="Enter your department or office"
                                                className="h-11 rounded-lg border-border bg-background text-sm"
                                            />
                                            <InputError
                                                message={errors.department}
                                            />
                                        </div>
                                        {[
                                            {
                                                name: 'position',
                                                label: 'Position / Designation',
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
                                                className="grid gap-2"
                                            >
                                                <Label htmlFor={field.name}>
                                                    {field.label}{' '}
                                                    <span className="text-destructive">
                                                        *
                                                    </span>
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
                                                    className="h-11 rounded-lg border-border bg-background text-sm"
                                                />
                                                <InputError
                                                    message={errors[field.name]}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            <div
                                className={
                                    isStudent
                                        ? 'grid gap-2'
                                        : 'space-y-1 border-b border-border pb-4 sm:col-span-2'
                                }
                            >
                                {!isStudent && (
                                    <h3 className="font-semibold text-foreground">
                                        Secure your account
                                    </h3>
                                )}
                            </div>
                            {isStudent ? (
                                <>
                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="password"
                                            className="text-sm font-medium text-foreground"
                                        >
                                            Password
                                        </Label>
                                        <PasswordInput
                                            id="password"
                                            required
                                            autoComplete="new-password"
                                            name="password"
                                            value={password}
                                            onChange={(event) =>
                                                setPassword(event.target.value)
                                            }
                                            placeholder="Create a strong password"
                                            passwordrules={passwordRules}
                                            className="h-11 rounded-lg border-border text-sm transition-all focus-visible:border-ustp-navy focus-visible:ring-ustp-navy/20"
                                        />
                                        {password.length > 0 && (
                                            <PasswordStrength
                                                value={password}
                                            />
                                        )}
                                        <InputError message={errors.password} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="password_confirmation"
                                            className="text-sm font-medium text-foreground"
                                        >
                                            Confirm Password
                                        </Label>
                                        <PasswordInput
                                            id="password_confirmation"
                                            required
                                            autoComplete="new-password"
                                            name="password_confirmation"
                                            placeholder="Re-enter password"
                                            passwordrules={passwordRules}
                                            className="h-11 rounded-lg border-border text-sm transition-all focus-visible:border-ustp-navy focus-visible:ring-ustp-navy/20"
                                        />
                                        <InputError
                                            message={
                                                errors.password_confirmation
                                            }
                                        />
                                    </div>
                                    <label className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                                        <input
                                            type="checkbox"
                                            id="terms"
                                            name="terms"
                                            value="on"
                                            required
                                            className="mt-0.5 size-4 shrink-0 accent-primary"
                                        />
                                        <span>
                                            I agree to the{' '}
                                            <a
                                                href={terms.url()}
                                                className="underline"
                                            >
                                                Terms of Service
                                            </a>{' '}
                                            and{' '}
                                            <a
                                                href={privacy.url()}
                                                className="underline"
                                            >
                                                Privacy Policy
                                            </a>
                                            .
                                        </span>
                                    </label>
                                </>
                            ) : (
                                <>
                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="password"
                                            className="text-sm font-medium text-foreground"
                                        >
                                            Password
                                        </Label>
                                        <PasswordInput
                                            id="password"
                                            required
                                            autoComplete="new-password"
                                            name="password"
                                            value={password}
                                            onChange={(event) =>
                                                setPassword(event.target.value)
                                            }
                                            placeholder="Create a password"
                                            passwordrules={passwordRules}
                                            className="h-11 rounded-lg border-border text-sm transition-colors focus-visible:border-ustp-navy focus-visible:ring-ustp-navy/20"
                                        />
                                        {password.length > 0 && (
                                            <PasswordStrength
                                                value={password}
                                                className="mt-1"
                                            />
                                        )}
                                        <InputError message={errors.password} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="password_confirmation"
                                            className="text-sm font-medium text-foreground"
                                        >
                                            Confirm password
                                        </Label>
                                        <PasswordInput
                                            id="password_confirmation"
                                            required
                                            autoComplete="new-password"
                                            name="password_confirmation"
                                            placeholder="Confirm your password"
                                            passwordrules={passwordRules}
                                            className="h-11 rounded-lg border-border text-sm transition-colors focus-visible:border-ustp-navy focus-visible:ring-ustp-navy/20"
                                        />
                                        <InputError
                                            message={
                                                errors.password_confirmation
                                            }
                                        />
                                    </div>
                                    <div className="mt-1 flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:col-span-2">
                                        <input
                                            type="checkbox"
                                            id="terms"
                                            name="terms"
                                            value="on"
                                            required
                                            className="mt-0.5 size-4 shrink-0 rounded-[4px] border border-input accent-ustp-navy focus-visible:ring-2 focus-visible:ring-ustp-navy/30 dark:border-white/20"
                                        />
                                        <Label
                                            htmlFor="terms"
                                            className="block text-sm leading-relaxed font-normal text-muted-foreground"
                                        >
                                            By clicking continue, you agree to
                                            our{' '}
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
                                </>
                            )}
                            {errors.terms && (
                                <div
                                    className={
                                        isStudent ? undefined : 'sm:col-span-2'
                                    }
                                >
                                    <InputError message={errors.terms} />
                                </div>
                            )}

                            <Button
                                type="submit"
                                className={
                                    isStudent
                                        ? 'h-11 w-full rounded-lg bg-ustp-gold text-sm font-semibold text-ustp-navy shadow-sm transition-colors hover:bg-ustp-gold-dark hover:text-white'
                                        : 'h-11 w-full rounded-lg bg-ustp-gold text-sm font-semibold text-ustp-navy shadow-sm transition-colors hover:bg-ustp-gold-dark hover:text-white sm:col-span-2'
                                }
                                disabled={processing}
                                data-test="register-user-button"
                            >
                                {processing && <Spinner />}
                                {isStudent
                                    ? 'Submit Registration'
                                    : 'Continue to email verification'}
                            </Button>
                        </div>

                        {!isStudent && (
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-border dark:border-white/10" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">
                                        or
                                    </span>
                                </div>
                            </div>
                        )}

                        <div
                            className={
                                isStudent
                                    ? 'border-t border-border pt-5 text-center text-sm leading-relaxed text-muted-foreground'
                                    : 'text-center text-sm text-muted-foreground'
                            }
                        >
                            {isStudent
                                ? 'Already registered? '
                                : 'Already have an account? '}
                            <TextLink
                                href={isStudent ? studentLogin() : login()}
                                data-test="team-invitation-login-link"
                                className="font-medium text-ustp-navy hover:text-ustp-navy-dark dark:text-white/80 dark:hover:text-white"
                            >
                                {isStudent
                                    ? 'Sign in to your account.'
                                    : 'Sign in'}
                            </TextLink>
                        </div>
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
        wide: !isStudent,
        title: isStudent ? 'Create an Account' : 'Create an account',
        description: undefined,
        icon: isStudent ? GraduationCap : undefined,
        iconClassName:
            'bg-green-100 text-green-600 dark:bg-green-950/60 dark:text-green-400',
    };
};
