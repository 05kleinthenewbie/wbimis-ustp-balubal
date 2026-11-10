import { Form, Head } from '@inertiajs/react';
import { ArrowRight, GraduationCap, Mail, User, Users } from 'lucide-react';
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
import { privacy, terms } from '@/routes';
import { login as facultyLogin } from '@/routes/faculty';
import { store } from '@/routes/register';
import { login as studentLogin } from '@/routes/student';

type Props = {
    passwordRules: string;
    programs?: string[];
};

const fieldClassName =
    'h-11 w-full rounded-lg border-border bg-background text-sm transition-colors focus-visible:border-ustp-navy focus-visible:ring-ustp-navy/20';
const labelClassName = 'text-sm font-medium text-foreground';
const detailsClassName =
    'grid min-w-0 items-start gap-x-6 gap-y-5 rounded-2xl border border-border bg-muted/20 p-4 sm:grid-cols-2 sm:p-6';
const defaultPrograms = ['BSA', 'BAT', 'BSIT', 'BTLED'];

export default function Register({ passwordRules, programs }: Props) {
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
            <Head
                title={
                    isStudent ? 'Student Registration' : 'Faculty Registration'
                }
            />
            <Form
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <input type="hidden" name="role" value={role} />
                        <section
                            className="grid items-start gap-x-6 gap-y-5 sm:grid-cols-2"
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
                            <div className="grid gap-4 sm:col-span-2 sm:grid-cols-[1fr_1fr_7rem]">
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
                                        className="grid content-start gap-2"
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
                                                required={
                                                    field.name !==
                                                    'middle_initial'
                                                }
                                                autoFocus={
                                                    field.name === 'first_name'
                                                }
                                                autoComplete={
                                                    field.autoComplete
                                                }
                                                placeholder={field.placeholder}
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
                                    type="text"
                                    inputMode={isStudent ? 'numeric' : 'text'}
                                    pattern={
                                        isStudent
                                            ? '[0-9]{1,20}'
                                            : '[A-Za-z0-9-]{1,20}'
                                    }
                                    maxLength={20}
                                    required
                                    placeholder={
                                        isStudent
                                            ? 'Student ID number'
                                            : 'Employee ID number'
                                    }
                                    aria-invalid={Boolean(errors.id_number)}
                                    className={fieldClassName}
                                />
                                <InputError message={errors.id_number} />
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
                                        required
                                        autoComplete="email"
                                        placeholder={
                                            isStudent
                                                ? 'name@example.com'
                                                : 'name@ustp.edu.ph'
                                        }
                                        aria-invalid={Boolean(errors.email)}
                                        className={`${fieldClassName} pl-9`}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {isStudent
                                        ? 'Personal or university email.'
                                        : 'Use your @ustp.edu.ph email.'}
                                </p>
                                {isAlertMessage(errors.email ?? '') ? (
                                    <StatusAlert message={errors.email} />
                                ) : (
                                    <InputError message={errors.email} />
                                )}
                            </div>
                            <InputError message={errors.role} />
                        </section>

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
                                    <div className="grid content-start gap-2">
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
                                                    programs ?? defaultPrograms
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
                                    <div className="grid content-start gap-2">
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
                                        <InputError
                                            message={errors.educational_level}
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="grid content-start gap-2">
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
                                    <div className="grid content-start gap-2">
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
                                            placeholder: 'e.g. Instructor I',
                                        },
                                        {
                                            name: 'contact_no',
                                            label: 'Contact number',
                                            placeholder: 'e.g. 09123456789',
                                        },
                                    ].map((field) => (
                                        <div
                                            key={field.name}
                                            className="grid content-start gap-2"
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
                                                    field.name === 'contact_no'
                                                        ? 'tel'
                                                        : 'text'
                                                }
                                                required
                                                maxLength={
                                                    field.name === 'contact_no'
                                                        ? 30
                                                        : 255
                                                }
                                                placeholder={field.placeholder}
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
                                <div className="grid content-start gap-2">
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

                        <section
                            className="grid items-start gap-x-6 gap-y-5 sm:grid-cols-2"
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
                            <div className="grid content-start gap-2">
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
                                {password.length > 0 && (
                                    <PasswordStrength
                                        value={password}
                                        className="mt-1"
                                    />
                                )}
                                <InputError message={errors.password} />
                            </div>
                            <div className="grid content-start gap-2">
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
                        </section>

                        <div className="grid gap-2">
                            <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-4">
                                <input
                                    type="checkbox"
                                    id="terms"
                                    name="terms"
                                    value="on"
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
                        <Button
                            type="submit"
                            disabled={processing}
                            data-test="register-user-button"
                            className="h-11 w-full rounded-lg bg-ustp-gold text-sm font-semibold text-ustp-navy shadow-sm transition-colors hover:bg-ustp-gold-dark hover:text-white"
                        >
                            {processing && <Spinner />}
                            {processing ? 'Submitting…' : 'Continue'}
                            {!processing && <ArrowRight className="size-4" />}
                        </Button>
                        <div className="border-t border-border pt-5 text-center text-sm leading-relaxed text-muted-foreground">
                            Already have an account?{' '}
                            <TextLink
                                href={
                                    isStudent ? studentLogin() : facultyLogin()
                                }
                                data-test="team-invitation-login-link"
                                className="font-medium text-ustp-navy hover:text-ustp-navy-dark dark:text-white/80 dark:hover:text-white"
                            >
                                Sign in
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
        wide: true,
        title: 'Create an account',
        icon: isStudent ? GraduationCap : Users,
        iconClassName: isStudent
            ? 'bg-green-100 text-green-600 dark:bg-green-950/60 dark:text-green-400'
            : 'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400',
    };
};
