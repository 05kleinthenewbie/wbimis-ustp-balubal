import { Form, Head } from '@inertiajs/react';
import { GraduationCap, Mail, Upload, User } from 'lucide-react';
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

type Props = {
    passwordRules: string;
};

const departmentOptions = [
    { value: 'BSA', label: 'BSA' },
    { value: 'BSIT', label: 'BSIT' },
    { value: 'BTLED', label: 'BTLED' },
];

export default function Register({ passwordRules }: Props) {
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
    const [idNumber, setIdNumber] = useState('');
    const [educationalLevel, setEducationalLevel] = useState('');
    const [yearLevel, setYearLevel] = useState('');
    const isStudent = role === 'student';

    return (
        <>
            <Head title="Register" />
            <Form
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid items-start gap-x-6 gap-y-5 sm:grid-cols-2">
                            <div className="space-y-1 border-b border-border pb-4 sm:col-span-2">
                                <h3 className="font-semibold text-foreground">
                                    Account details
                                </h3>
                            </div>
                            <div className="grid gap-4">
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
                                        <div key={field} className="grid gap-2">
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
                                                        set(event.target.value)
                                                    }
                                                    required={
                                                        field !==
                                                        'middle_initial'
                                                    }
                                                    autoFocus={
                                                        field === 'first_name'
                                                    }
                                                    autoComplete={complete}
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
                                    <InputError message={errors.email} />
                                )}
                            </div>

                            <input type="hidden" name="role" value={role} />
                            {errors.role && (
                                <div className="sm:col-span-2">
                                    <InputError message={errors.role} />
                                </div>
                            )}

                            {role === 'faculty_staff' && (
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
                            )}

                            <div className="grid min-w-0 items-start gap-x-6 gap-y-5 rounded-2xl border border-border bg-muted/20 p-3 sm:col-span-2 sm:grid-cols-2 sm:p-6">
                                <div className="space-y-1 sm:col-span-2">
                                    <h3 className="font-semibold text-foreground">
                                        {isStudent
                                            ? 'Student information'
                                            : 'Employment information'}
                                    </h3>
                                </div>
                                {isStudent && (
                                    <>
                                        <div className="grid gap-2">
                                            <Label htmlFor="id_number">
                                                University ID number
                                                <span className="ml-1 text-destructive">
                                                    *
                                                </span>
                                            </Label>
                                            <div className="relative">
                                                <GraduationCap className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                                <Input
                                                    id="id_number"
                                                    name="id_number"
                                                    required
                                                    inputMode="numeric"
                                                    autoComplete="off"
                                                    value={idNumber}
                                                    onChange={(event) =>
                                                        setIdNumber(
                                                            event.target.value
                                                                .replace(
                                                                    /\D/g,
                                                                    '',
                                                                )
                                                                .slice(0, 10),
                                                        )
                                                    }
                                                    placeholder="2023303709"
                                                    className="h-11 rounded-lg border-border pl-9 text-sm transition-colors focus-visible:border-ustp-navy focus-visible:ring-ustp-navy/20"
                                                />
                                            </div>
                                            {isAlertMessage(
                                                errors.id_number ?? '',
                                            ) ? (
                                                <StatusAlert
                                                    message={errors.id_number}
                                                    className="mt-1.5"
                                                />
                                            ) : (
                                                <InputError
                                                    message={errors.id_number}
                                                />
                                            )}
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="department">
                                                Program
                                                <span className="ml-1 text-destructive">
                                                    *
                                                </span>
                                            </Label>
                                            <Select
                                                name="department"
                                                value={department}
                                                onValueChange={setDepartment}
                                                required
                                            >
                                                <SelectTrigger
                                                    id="department"
                                                    className="h-11 w-full rounded-lg border-border text-sm transition-colors focus-visible:border-ustp-navy focus-visible:ring-ustp-navy/20"
                                                >
                                                    <SelectValue placeholder="Select your program" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {departmentOptions.map(
                                                        (option) => (
                                                            <SelectItem
                                                                key={
                                                                    option.value
                                                                }
                                                                value={
                                                                    option.value
                                                                }
                                                            >
                                                                {option.label}
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            <InputError
                                                message={errors.department}
                                            />
                                        </div>
                                    </>
                                )}
                                {!isStudent && (
                                    <>
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
                                                name: 'employee_id_number',
                                                label: 'Employee ID number',
                                                placeholder: 'Your employee ID',
                                            },
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
                                                        'employee_id_number'
                                                            ? 50
                                                            : field.name ===
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
                                    </>
                                )}
                                {isStudent && (
                                    <>
                                        <div className="grid gap-2">
                                            <Label htmlFor="educational_level">
                                                Educational level
                                                <span className="ml-1 text-destructive">
                                                    *
                                                </span>
                                            </Label>
                                            <Select
                                                name="educational_level"
                                                value={educationalLevel}
                                                onValueChange={
                                                    setEducationalLevel
                                                }
                                                required
                                            >
                                                <SelectTrigger
                                                    id="educational_level"
                                                    className="h-11 w-full rounded-lg border-border bg-background text-sm"
                                                >
                                                    <SelectValue placeholder="Select educational level" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="senior_high">
                                                        Senior High
                                                    </SelectItem>
                                                    <SelectItem value="college">
                                                        Undergraduate
                                                    </SelectItem>
                                                    <SelectItem value="graduate">
                                                        Graduate
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <InputError
                                                message={
                                                    errors.educational_level
                                                }
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label
                                                htmlFor="year_level"
                                                className="text-sm font-medium text-foreground"
                                            >
                                                Year level
                                                <span className="ml-1 text-destructive">
                                                    *
                                                </span>
                                            </Label>
                                            <Select
                                                name="year_level"
                                                value={yearLevel}
                                                onValueChange={setYearLevel}
                                                required
                                            >
                                                <SelectTrigger
                                                    id="year_level"
                                                    className="h-11 w-full rounded-lg border-border bg-background text-sm"
                                                >
                                                    <SelectValue placeholder="Select year" />
                                                </SelectTrigger>
                                                <SelectContent>
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
                                            <InputError
                                                message={errors.year_level}
                                            />
                                        </div>
                                    </>
                                )}

                                <div className="grid gap-2 sm:col-span-2">
                                    <Label
                                        htmlFor={
                                            isStudent
                                                ? 'cor'
                                                : 'employment_document'
                                        }
                                        className="text-sm font-medium text-foreground"
                                    >
                                        {isStudent
                                            ? 'Student ID or Certificate of Registration (COR)'
                                            : 'Employee ID or Certificate of Employment'}
                                        <span className="ml-1 text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <div className="min-w-0 rounded-xl border border-dashed border-border bg-background p-3 sm:p-4">
                                        <div className="mb-3 flex items-center gap-3">
                                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-ustp-navy/5 text-ustp-navy dark:bg-white/10 dark:text-white">
                                                <Upload className="size-5" />
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {isStudent &&
                                                    'Upload either your student ID or COR. '}
                                                PDF, JPG, or PNG · Up to 5 MB
                                            </p>
                                        </div>
                                        <input
                                            key={
                                                isStudent
                                                    ? 'cor'
                                                    : 'employment_document'
                                            }
                                            id={
                                                isStudent
                                                    ? 'cor'
                                                    : 'employment_document'
                                            }
                                            name={
                                                isStudent
                                                    ? 'cor'
                                                    : 'employment_document'
                                            }
                                            type="file"
                                            required
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            className="block w-full min-w-0 cursor-pointer text-sm text-muted-foreground file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-ustp-navy file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-white hover:file:bg-ustp-navy-dark"
                                        />
                                    </div>
                                    <InputError
                                        message={
                                            isStudent
                                                ? errors.cor
                                                : errors.employment_document
                                        }
                                    />
                                </div>
                            </div>

                            <div className="space-y-1 border-b border-border pb-4 sm:col-span-2">
                                <h3 className="font-semibold text-foreground">
                                    Secure your account
                                </h3>
                            </div>
                            <div className="grid gap-2">
                                <Label
                                    htmlFor="password"
                                    className="text-sm font-medium text-foreground"
                                >
                                    Password
                                </Label>
                                <div className="relative">
                                    <PasswordInput
                                        id="password"
                                        required
                                        autoComplete="new-password"
                                        name="password"
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                        placeholder="Create a password"
                                        passwordrules={passwordRules}
                                        className="h-11 rounded-lg border-border text-sm transition-colors focus-visible:border-ustp-navy focus-visible:ring-ustp-navy/20"
                                    />
                                </div>
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
                                <div className="relative">
                                    <PasswordInput
                                        id="password_confirmation"
                                        required
                                        autoComplete="new-password"
                                        name="password_confirmation"
                                        placeholder="Confirm your password"
                                        passwordrules={passwordRules}
                                        className="h-11 rounded-lg border-border text-sm transition-colors focus-visible:border-ustp-navy focus-visible:ring-ustp-navy/20"
                                    />
                                </div>
                                <InputError
                                    message={errors.password_confirmation}
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
                                    By clicking continue, you agree to our{' '}
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
                            {errors.terms && (
                                <div className="sm:col-span-2">
                                    <InputError message={errors.terms} />
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="h-11 w-full rounded-lg bg-ustp-gold text-sm font-semibold text-ustp-navy shadow-sm transition-colors hover:bg-ustp-gold-dark hover:text-white sm:col-span-2"
                                disabled={
                                    processing ||
                                    (isStudent && !/^[0-9]{10}$/.test(idNumber))
                                }
                                data-test="register-user-button"
                            >
                                {processing && <Spinner />}
                                Continue to email verification
                            </Button>
                        </div>

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

                        <div className="text-center text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <TextLink
                                href={login()}
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

Register.layout = {
    wide: true,
    title: 'Create an account',
};
