import { QrCode, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { createLoginCodeGraphics } from '@/lib/student-login-code';
import type { LoginCodeGraphic } from '@/lib/student-login-code';
import { store } from '@/routes/student/login-codes';

type GeneratedCode = {
    expiresAt: string;
    qr: LoginCodeGraphic;
    barcode: LoginCodeGraphic;
};

function CodeGraphic({
    graphic,
    label,
    className,
}: {
    graphic: LoginCodeGraphic;
    label: string;
    className: string;
}) {
    return (
        <svg
            viewBox={`0 0 ${graphic.width} ${graphic.height}`}
            role="img"
            aria-label={label}
            className={className}
            shapeRendering="crispEdges"
        >
            <rect width={graphic.width} height={graphic.height} fill="white" />
            <path d={graphic.path} fill="black" />
        </svg>
    );
}

export function StudentLoginCodeButton() {
    const [open, setOpen] = useState(false);
    const [generated, setGenerated] = useState<GeneratedCode | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [now, setNow] = useState(0);

    useEffect(() => {
        if (!open || !generated) {
            return;
        }

        const timer = window.setInterval(() => setNow(Date.now()), 1000);

        return () => window.clearInterval(timer);
    }, [open, generated]);

    async function generate() {
        setOpen(true);
        setBusy(true);
        setGenerated(null);
        setError('');

        try {
            const token = document.cookie
                .split('; ')
                .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
                ?.slice('XSRF-TOKEN='.length);
            const response = await fetch(store.url(), {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': token ? decodeURIComponent(token) : '',
                },
            });

            if (!response.ok) {
                throw new Error(
                    response.status === 429
                        ? 'Please wait a minute before generating another code.'
                        : 'Could not create your login code. Please try again.',
                );
            }

            const result: { code: string; expiresAt: string } =
                await response.json();
            const graphics = await createLoginCodeGraphics(result.code);
            setNow(Date.now());
            setGenerated({ expiresAt: result.expiresAt, ...graphics });
        } catch (exception) {
            setError(
                exception instanceof Error
                    ? exception.message
                    : 'Could not create your login code.',
            );
        } finally {
            setBusy(false);
        }
    }

    const expired =
        generated !== null && now >= Date.parse(generated.expiresAt);

    return (
        <>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-white hover:bg-ustp-navy-light hover:text-ustp-gold"
                onClick={() => void generate()}
                disabled={busy}
                aria-label="Generate QR or barcode login code"
                title="Generate QR / barcode login code"
            >
                <QrCode className="size-5" />
            </Button>
            <Dialog
                open={open}
                onOpenChange={(value) => {
                    setOpen(value);

                    if (!value) {
                        setGenerated(null);
                    }
                }}
            >
                <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Single-use student login code</DialogTitle>
                        <DialogDescription>
                            On your other device, open Student Sign In and
                            choose Scan QR / Barcode. Either code signs in to
                            your account once and expires after five minutes.
                            Generating a new code invalidates the previous one.
                        </DialogDescription>
                    </DialogHeader>
                    {busy && (
                        <div className="flex justify-center py-12">
                            <Spinner />
                        </div>
                    )}
                    {error && (
                        <p role="alert" className="text-sm text-destructive">
                            {error}
                        </p>
                    )}
                    {generated && !expired && (
                        <div className="space-y-4">
                            <CodeGraphic
                                graphic={generated.qr}
                                label="Single-use QR login code"
                                className="mx-auto size-64 max-w-full rounded-xl bg-white p-2"
                            />
                            <div className="overflow-x-auto rounded-xl border bg-white p-3">
                                <CodeGraphic
                                    graphic={generated.barcode}
                                    label="Single-use Code 128 login barcode"
                                    className="h-28 min-w-[640px]"
                                />
                            </div>
                            <p className="text-center text-sm text-muted-foreground">
                                Expires at{' '}
                                {new Date(
                                    generated.expiresAt,
                                ).toLocaleTimeString()}
                                . Keep this code private—it grants access to
                                your account.
                            </p>
                        </div>
                    )}
                    {expired && (
                        <p role="status" className="text-sm text-destructive">
                            This code has expired. Generate a new one.
                        </p>
                    )}
                    <Button
                        type="button"
                        onClick={() => void generate()}
                        disabled={busy}
                        className="bg-ustp-gold text-ustp-navy hover:bg-ustp-gold-dark"
                    >
                        <RefreshCw className="size-4" /> Generate new code
                    </Button>
                </DialogContent>
            </Dialog>
        </>
    );
}
