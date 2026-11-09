import { Form, Head } from '@inertiajs/react';
import { ArrowRight, LockKeyhole, Mail, Shield } from 'lucide-react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import StatusAlert, { isAlertMessage } from '@/components/status-alert';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';
import { authenticate } from '@/routes/student';
import { request as studentForgotPassword } from '@/routes/student/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
    showRegister?: boolean;
    portal?: 'admin' | 'faculty' | 'student';
    title?: string;
};

export default function Login({
    status,
    canResetPassword,
    showRegister = false,
    portal,
    title = 'Sign in',
}: Props) {
    const isStudent = portal === 'student';

    return (
        <>
            <Head title={title} />

            {status && <StatusAlert message={status} className="mb-5" />}

            <Form
                {...(isStudent ? authenticate.form() : store.form())}
                resetOnSuccess={['password']}
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        {portal && !isStudent && (
                            <input type="hidden" name="portal" value={portal} />
                        )}

                        <div className="grid items-start gap-5">
                            <div className="grid content-start gap-2">
                                <Label
                                    htmlFor="email"
                                    className="text-sm font-medium text-foreground"
                                >
                                    Email address
                                </Label>
                                <div className="relative flex items-center">
                                    <Mail className="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        required
                                        autoFocus
                                        autoComplete="username"
                                        aria-invalid={Boolean(errors.email)}
                                        placeholder={
                                            isStudent
                                                ? 'name@example.com'
                                                : 'name.id@ustp.edu.ph'
                                        }
                                        className="h-11 rounded-lg border-border bg-background pl-10 text-sm transition-colors focus-visible:border-ustp-navy focus-visible:ring-ustp-navy/20"
                                    />
                                </div>
                                {errors.email && (
                                    <StatusAlert
                                        message={errors.email}
                                        variant={
                                            isAlertMessage(errors.email)
                                                ? 'warning'
                                                : 'error'
                                        }
                                        className="mt-1.5"
                                    />
                                )}
                            </div>

                            <div className="grid content-start gap-2">
                                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                                    <Label
                                        htmlFor="password"
                                        className="text-sm font-medium text-foreground"
                                    >
                                        Password
                                    </Label>
                                    {canResetPassword && (
                                        <TextLink
                                            href={
                                                isStudent
                                                    ? studentForgotPassword()
                                                    : request()
                                            }
                                            className="py-1 text-sm font-medium text-ustp-navy hover:text-ustp-navy-dark dark:text-white/80 dark:hover:text-white"
                                        >
                                            Forgot password?
                                        </TextLink>
                                    )}
                                </div>
                                <div className="relative">
                                    <LockKeyhole className="pointer-events-none absolute top-1/2 left-3 z-10 size-4.5 -translate-y-1/2 text-muted-foreground" />
                                    <PasswordInput
                                        id="password"
                                        name="password"
                                        required
                                        autoComplete="current-password"
                                        aria-invalid={Boolean(errors.password)}
                                        placeholder="Enter your password"
                                        className="h-11 rounded-lg border-border bg-background pl-10 text-sm transition-colors focus-visible:border-ustp-navy focus-visible:ring-ustp-navy/20"
                                    />
                                </div>
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-4">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    className="border-border data-[state=checked]:border-ustp-navy data-[state=checked]:bg-ustp-navy dark:border-neutral-600"
                                />
                                <Label
                                    htmlFor="remember"
                                    className="text-sm text-muted-foreground"
                                >
                                    Remember me for 30 days
                                </Label>
                            </div>

                            <Button
                                type="submit"
                                size="lg"
                                className="h-11 w-full rounded-lg bg-ustp-gold text-sm font-semibold text-ustp-navy shadow-sm transition-colors hover:bg-ustp-gold-dark hover:text-white"
                                disabled={processing}
                                data-test={
                                    isStudent
                                        ? 'student-login-button'
                                        : 'login-button'
                                }
                            >
                                {processing && <Spinner />}
                                {processing ? 'Signing in…' : 'Sign in'}
                                {!processing && (
                                    <ArrowRight className="size-4" />
                                )}
                            </Button>
                        </div>

                        {showRegister && (
                            <div className="border-t border-border pt-5 text-center text-sm leading-relaxed text-muted-foreground">
                                Don't have an account?{' '}
                                <TextLink
                                    href={
                                        isStudent
                                            ? register({
                                                  query: { role: 'student' },
                                              })
                                            : register()
                                    }
                                    data-test="register-link"
                                    className="font-medium text-ustp-navy hover:text-ustp-navy-dark dark:text-white/80 dark:hover:text-white"
                                >
                                    Create account
                                </TextLink>
                            </div>
                        )}
                    </>
                )}
            </Form>
        </>
    );
}

Login.layout = {
    wide: false,
    title: 'Administrator Sign In',
    icon: Shield,
    iconClassName:
        'bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400',
};
