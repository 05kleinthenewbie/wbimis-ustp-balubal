import { Form, Head } from '@inertiajs/react';
import { ArrowLeft, Mail } from 'lucide-react';
import InputError from '@/components/input-error';
import StatusAlert from '@/components/status-alert';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes/student';
import { email } from '@/routes/student/password';

type Props = {
    status?: string;
};

export default function StudentForgotPassword({ status }: Props) {
    return (
        <>
            <Head title="Forgot your password?" />

            <Form {...email.form()} className="flex flex-col gap-5">
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-1.5">
                            <Label
                                htmlFor="email"
                                className="text-sm font-medium text-foreground"
                            >
                                Gmail address
                            </Label>
                            <div className="relative flex items-center">
                                <Mail className="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    autoComplete="email"
                                    placeholder="name@gmail.com"
                                    className="h-11 rounded-lg border-border pl-10 text-sm transition-all focus-visible:border-ustp-navy focus-visible:ring-ustp-navy/20"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Enter the Gmail address on file with the ICT
                                office. We will email you a link to set a new
                                password.
                            </p>
                            <InputError message={errors.email} />
                        </div>

                        <Button
                            type="submit"
                            className="mt-1 h-11 w-full rounded-xl bg-ustp-gold font-semibold text-ustp-navy shadow-sm shadow-ustp-gold/30 transition-all hover:-translate-y-0.5 hover:bg-ustp-gold-dark hover:text-white hover:shadow-md hover:shadow-ustp-gold/30 active:scale-[0.98]"
                            disabled={processing}
                            data-test="student-send-reset-link-button"
                        >
                            {processing && <Spinner />}
                            Send Reset Link
                        </Button>
                    </>
                )}
            </Form>

            {status && <StatusAlert message={status} className="mt-4" />}

            <div className="pt-1 text-center text-sm text-muted-foreground">
                <TextLink
                    href={login()}
                    className="inline-flex items-center gap-1.5 font-medium text-ustp-navy hover:text-ustp-navy-dark dark:text-white/80 dark:hover:text-white"
                >
                    <ArrowLeft className="size-3.5" />
                    Back to student sign in
                </TextLink>
            </div>
        </>
    );
}

StudentForgotPassword.layout = {
    title: 'Forgot your password?',
    description: 'Enter your Gmail address to receive a password reset link.',
};
