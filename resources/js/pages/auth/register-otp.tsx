import { Form, Head } from '@inertiajs/react';
import { MailCheck } from 'lucide-react';
import StatusAlert from '@/components/status-alert';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { register } from '@/routes';
import { resend, verify } from '@/routes/register/otp';

type Props = {
    email: string;
    status?: string;
    studentRegistration?: boolean;
};

export default function RegisterOtp({
    status,
    studentRegistration = false,
}: Props) {
    return (
        <>
            <Head title="Verify your email" />

            <div className="mb-6 flex flex-col items-center gap-3 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-ustp-gold/15 text-ustp-gold-dark dark:text-ustp-gold">
                    <MailCheck className="size-7" />
                </div>
            </div>

            {status && <StatusAlert message={status} className="mb-4" />}

            <Form
                {...verify.form()}
                disableWhileProcessing
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-2">
                            <Label
                                htmlFor="code"
                                className="text-sm font-medium text-foreground"
                            >
                                Verification code
                            </Label>
                            <Input
                                id="code"
                                name="code"
                                required
                                autoFocus
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                pattern="[0-9]{6}"
                                maxLength={6}
                                placeholder="000000"
                                className="h-12 rounded-lg border-border text-center font-mono text-2xl tracking-[0.4em] transition-colors focus-visible:border-ustp-navy focus-visible:ring-ustp-navy/20"
                            />
                            {errors.code ? (
                                <StatusAlert
                                    message={errors.code}
                                    variant="error"
                                    className="mt-1.5"
                                />
                            ) : null}
                        </div>

                        <Button
                            type="submit"
                            className="h-11 w-full rounded-lg bg-ustp-gold font-semibold text-ustp-navy shadow-md shadow-ustp-gold/20 transition-all hover:-translate-y-0.5 hover:bg-ustp-gold-dark hover:text-white hover:shadow-lg hover:shadow-ustp-gold/30 active:scale-[0.98]"
                            disabled={processing}
                            data-test="verify-otp-button"
                        >
                            {processing && <Spinner />}
                            Verify and create account
                        </Button>
                    </>
                )}
            </Form>

            <Form
                {...resend.form()}
                disableWhileProcessing
                className="mt-4 text-center"
            >
                {({ processing, errors }) => (
                    <>
                        <Button
                            type="submit"
                            variant="ghost"
                            disabled={processing}
                            className="text-sm font-medium text-ustp-navy hover:text-ustp-navy-dark dark:text-white/80 dark:hover:text-white"
                            data-test="resend-otp-button"
                        >
                            {processing && <Spinner />}
                            Didn't get it? Resend code
                        </Button>
                        {errors.resend ? (
                            <StatusAlert
                                message={errors.resend}
                                variant="error"
                                className="mt-2"
                            />
                        ) : null}
                    </>
                )}
            </Form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
                Entered the wrong email address?{' '}
                <TextLink
                    href={register(
                        studentRegistration
                            ? { query: { role: 'student' } }
                            : undefined,
                    )}
                    className="font-medium text-ustp-navy hover:text-ustp-navy-dark dark:text-white/80 dark:hover:text-white"
                    data-test="register-restart-link"
                >
                    Start over
                </TextLink>
            </div>
        </>
    );
}

RegisterOtp.layout = (props: Props) => ({
    title: 'Verify your email',
    description: `Enter the 6-digit code we sent to ${props.email ?? 'your email address'}.`,
});
