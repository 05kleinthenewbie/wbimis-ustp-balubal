import { Form, Head } from '@inertiajs/react';
import { MailCheck } from 'lucide-react';
import { useRef, useState } from 'react';
import type { ClipboardEvent, KeyboardEvent } from 'react';
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
    const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
    const inputs = useRef<Array<HTMLInputElement | null>>([]);
    const code = digits.join('');
    const isComplete = digits.every((digit) => digit !== '');

    function setDigit(index: number, value: string) {
        const cleaned = value.replace(/\D/g, '');

        if (cleaned.length > 1) {
            const pasted = cleaned.slice(0, 6 - index);

            setDigits((current) => {
                const next = [...current];
                pasted.split('').forEach((digit, offset) => {
                    next[index + offset] = digit;
                });

                return next;
            });
            inputs.current[Math.min(index + pasted.length, 6) - 1]?.focus();

            return;
        }

        const digit = cleaned.slice(-1);

        setDigits((current) => {
            const next = [...current];
            next[index] = digit;

            return next;
        });

        if (digit && index < digits.length - 1) {
            inputs.current[index + 1]?.focus();
        }
    }

    function handleKeyDown(
        index: number,
        event: KeyboardEvent<HTMLInputElement>,
    ) {
        if (event.key === 'Backspace' && !digits[index] && index > 0) {
            event.preventDefault();

            setDigits((current) => {
                const next = [...current];
                next[index - 1] = '';

                return next;
            });
            inputs.current[index - 1]?.focus();
        }

        if (event.key === 'ArrowLeft' && index > 0) {
            event.preventDefault();
            inputs.current[index - 1]?.focus();
        }

        if (event.key === 'ArrowRight' && index < digits.length - 1) {
            event.preventDefault();
            inputs.current[index + 1]?.focus();
        }
    }

    function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
        const pasted = event.clipboardData
            .getData('text')
            .replace(/\D/g, '')
            .slice(0, 6);

        if (pasted === '') {
            return;
        }

        event.preventDefault();

        const next = Array(6)
            .fill('')
            .map((_, index) => pasted[index] ?? '');

        setDigits(next);
        inputs.current[Math.min(pasted.length, 6) - 1]?.focus();
    }

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
                onSuccess={() => {
                    try {
                        sessionStorage.removeItem('wbimis-register-draft');
                    } catch {
                        // Ignore storage errors.
                    }
                }}
                className="flex flex-col gap-4"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-2">
                            <Label
                                htmlFor="code-0"
                                className="text-center text-sm font-medium text-foreground"
                            >
                                Verification code
                            </Label>

                            <input type="hidden" name="code" value={code} />

                            <div
                                className="flex justify-center gap-2 sm:gap-2.5"
                                role="group"
                                aria-label="6-digit verification code"
                            >
                                {digits.map((digit, index) => (
                                    <Input
                                        key={index}
                                        id={`code-${index}`}
                                        ref={(element) => {
                                            inputs.current[index] = element;
                                        }}
                                        value={digit}
                                        onChange={(event) =>
                                            setDigit(index, event.target.value)
                                        }
                                        onKeyDown={(event) =>
                                            handleKeyDown(index, event)
                                        }
                                        onPaste={handlePaste}
                                        onFocus={(event) =>
                                            event.currentTarget.select()
                                        }
                                        autoFocus={index === 0}
                                        inputMode="numeric"
                                        autoComplete={
                                            index === 0
                                                ? 'one-time-code'
                                                : 'off'
                                        }
                                        pattern="[0-9]"
                                        maxLength={1}
                                        aria-label={`Digit ${index + 1} of 6`}
                                        aria-invalid={Boolean(errors.code)}
                                        className={`h-16 w-11 rounded-xl bg-background text-center font-mono text-[32px] leading-none transition-colors sm:w-12 ${
                                            errors.code
                                                ? 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20'
                                                : 'border-border focus-visible:border-ustp-navy focus-visible:ring-ustp-navy/20'
                                        }`}
                                    />
                                ))}
                            </div>

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
                            disabled={processing || !isComplete}
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
    hideBack: true,
});
