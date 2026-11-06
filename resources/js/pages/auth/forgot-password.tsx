// Components
import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import StatusAlert from '@/components/status-alert';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';
import { email } from '@/routes/password';

export default function ForgotPassword({ status }: { status?: string }) {
    return (
        <>
            <Head title="Recover password" />

            <Form {...email.form()} className="space-y-4">
                {({ processing, errors }) => (
                    <>
                        <div className="space-y-2">
                            <Label
                                htmlFor="email"
                                className="text-sm font-medium"
                            >
                                Email
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                required
                                autoFocus
                                autoComplete="email"
                                placeholder="name@example.com"
                                className="h-11 rounded-lg border-border text-sm transition-all focus-visible:border-ustp-navy focus-visible:ring-ustp-navy/20"
                            />
                            <InputError message={errors.email} />
                        </div>

                        <Button
                            type="submit"
                            className="h-11 w-full rounded-xl bg-ustp-gold font-semibold text-ustp-navy shadow-sm shadow-ustp-gold/30 transition-all hover:-translate-y-0.5 hover:bg-ustp-gold-dark hover:text-white hover:shadow-md hover:shadow-ustp-gold/30 active:scale-[0.98]"
                            disabled={processing}
                            data-test="email-password-reset-link-button"
                        >
                            {processing && <Spinner />}
                            Send Reset Link
                        </Button>

                        <p className="text-center text-sm text-muted-foreground">
                            We'll send you a link to reset your password.
                        </p>
                    </>
                )}
            </Form>

            {status && <StatusAlert message={status} className="mt-4" />}

            <div className="-mx-4 mt-6 -mb-5 border-t border-border bg-muted px-4 py-4 text-center text-sm text-accent-foreground sm:-mx-8 sm:-mb-8 sm:px-8">
                Remembered your password?{' '}
                <TextLink
                    href={login()}
                    data-test="login-link"
                    className="font-medium text-ustp-navy underline-offset-4 hover:text-ustp-navy-dark dark:text-white/80 dark:hover:text-white"
                >
                    Sign in
                </TextLink>
            </div>
        </>
    );
}

ForgotPassword.layout = {
    title: 'Recover Password',
    description: 'Enter your email to receive a reset link',
};
