import { Form, Head } from '@inertiajs/react';
import { GraduationCap, Mail } from 'lucide-react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import StatusAlert from '@/components/status-alert';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { register } from '@/routes';
import { authenticate } from '@/routes/student';
import { request as forgotPassword } from '@/routes/student/password';

type Props = {
    status?: string;
};

export default function StudentLogin({ status }: Props) {
    return (
        <>
            <Head title="Student Sign In" />

            {status && <StatusAlert message={status} className="mb-5" />}

            <Form
                {...authenticate.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
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
                                        placeholder="name@example.com"
                                        className="h-11 rounded-lg border-border pl-10 text-sm transition-all focus-visible:border-ustp-navy focus-visible:ring-ustp-navy/20"
                                    />
                                </div>
                                {errors.email && (
                                    <StatusAlert
                                        message={errors.email}
                                        variant="warning"
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
                                    <TextLink
                                        href={forgotPassword()}
                                        className="py-1 text-sm font-medium text-ustp-navy hover:text-ustp-navy-dark dark:text-white/80 dark:hover:text-white"
                                    >
                                        Forgot password?
                                    </TextLink>
                                </div>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    autoComplete="current-password"
                                    placeholder="Enter your password"
                                    className="h-11 rounded-lg border-border text-sm transition-all focus-visible:border-ustp-navy focus-visible:ring-ustp-navy/20"
                                />
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
                                data-test="student-login-button"
                            >
                                {processing && <Spinner />}
                                Sign in
                            </Button>
                        </div>

                        <div className="border-t border-border pt-5 text-center text-sm leading-relaxed text-muted-foreground">
                            First time here?{' '}
                            <TextLink
                                href={register({
                                    query: { role: 'student' },
                                })}
                                className="font-medium text-ustp-navy hover:text-ustp-navy-dark dark:text-white/80 dark:hover:text-white"
                            >
                                Create a student account
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

StudentLogin.layout = {
    wide: false,
    title: 'Student Portal',
    icon: GraduationCap,
    iconClassName:
        'bg-green-100 text-green-600 dark:bg-green-950/60 dark:text-green-400',
};
