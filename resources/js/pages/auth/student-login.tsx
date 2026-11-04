import { Form, Head, router } from '@inertiajs/react';
import { GraduationCap, ScanLine } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { LoginCodeScanner } from '@/components/login-code-scanner';
import PasswordInput from '@/components/password-input';
import StatusAlert from '@/components/status-alert';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { classifyLoginScan } from '@/lib/student-login-code';
import { register } from '@/routes';
import { authenticate } from '@/routes/student';
import { redeem } from '@/routes/student/login-codes';
import { request as forgotPassword } from '@/routes/student/password';

type Props = {
    status?: string;
    idNumber?: string | null;
};

export default function StudentLogin({ status, idNumber }: Props) {
    const [scanOpen, setScanOpen] = useState(false);
    const [scanProcessing, setScanProcessing] = useState(false);
    const [scanMessage, setScanMessage] = useState('');
    const [studentId, setStudentId] = useState(idNumber ?? '');

    function handleScan(text: string) {
        const result = classifyLoginScan(text);
        setScanOpen(false);

        if (result.type === 'student_id') {
            setStudentId(result.idNumber);
            setScanMessage(
                'Student ID detected. Enter your password to sign in.',
            );

            return;
        }

        if (result.type === 'unsupported') {
            setScanMessage(
                'This is not a supported login code. Generate a secure code from a signed-in student account, or enter your ID number and password.',
            );

            return;
        }

        setScanProcessing(true);
        setScanMessage('');
        router.post(
            redeem.url(),
            { code: result.code },
            {
                onError: (errors) =>
                    setScanMessage(
                        errors.code ?? 'Could not sign in with this code.',
                    ),
                onFinish: () => setScanProcessing(false),
            },
        );
    }

    return (
        <>
            <Head title="Student Sign In" />

            {status && <StatusAlert message={status} className="mb-5" />}
            {scanMessage && (
                <StatusAlert
                    message={scanMessage}
                    variant="warning"
                    className="mb-5"
                />
            )}
            <Button
                type="button"
                variant="outline"
                onClick={() => {
                    setScanMessage('');
                    setScanOpen(true);
                }}
                disabled={scanProcessing}
                className="mb-5 h-11 w-full"
                data-test="student-scan-login-button"
            >
                {scanProcessing ? <Spinner /> : <ScanLine className="size-4" />}{' '}
                {scanProcessing ? 'Signing in…' : 'Scan QR / Barcode'}
            </Button>
            <LoginCodeScanner
                open={scanOpen}
                onOpenChange={setScanOpen}
                onResult={handleScan}
            />

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
                                    htmlFor="id_number"
                                    className="text-sm font-medium text-foreground"
                                >
                                    Student ID
                                </Label>
                                <div className="relative flex items-center">
                                    <GraduationCap className="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="id_number"
                                        type="text"
                                        name="id_number"
                                        value={studentId}
                                        onChange={(event) =>
                                            setStudentId(event.target.value)
                                        }
                                        required
                                        autoFocus
                                        autoComplete="username"
                                        inputMode="numeric"
                                        maxLength={10}
                                        placeholder="e.g. 2023303709"
                                        className="h-11 rounded-lg border-border pl-10 text-sm transition-all focus-visible:border-ustp-navy focus-visible:ring-ustp-navy/20"
                                    />
                                </div>
                                {errors.id_number && (
                                    <StatusAlert
                                        message={errors.id_number}
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
                                        className="py-1 text-xs font-medium text-ustp-navy hover:text-ustp-navy-dark sm:py-0 dark:text-white/80 dark:hover:text-white"
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
                                disabled={processing || scanProcessing}
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
