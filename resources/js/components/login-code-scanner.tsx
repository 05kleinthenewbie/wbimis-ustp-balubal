import type { IScannerControls } from '@zxing/browser';
import { Camera, CameraOff, ImagePlus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onResult: (text: string) => void;
};

export function LoginCodeScanner({ open, onOpenChange, onResult }: Props) {
    const video = useRef<HTMLVideoElement>(null);
    const controls = useRef<IScannerControls | null>(null);
    const operation = useRef(0);
    const [running, setRunning] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) {
            return;
        }

        const scanner = controls;
        const currentOperation = operation;

        return () => {
            currentOperation.current++;
            scanner.current?.stop();
            scanner.current = null;
        };
    }, [open]);

    function stop() {
        operation.current++;
        controls.current?.stop();
        controls.current = null;
        setRunning(false);
        setBusy(false);
    }

    async function start() {
        stop();
        setError('');

        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
            setError(
                'Camera scanning requires HTTPS or localhost. You can upload a code image instead.',
            );

            return;
        }

        const currentOperation = operation.current;
        setBusy(true);

        try {
            const { BrowserMultiFormatReader } = await import('@zxing/browser');

            if (!video.current || operation.current !== currentOperation) {
                return;
            }

            const reader = new BrowserMultiFormatReader();
            let found = false;
            const scannerControls = await reader.decodeFromConstraints(
                {
                    audio: false,
                    video: {
                        facingMode: { ideal: 'environment' },
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                    },
                },
                video.current,
                (result, _error, camera) => {
                    if (
                        result &&
                        !found &&
                        operation.current === currentOperation
                    ) {
                        found = true;
                        camera.stop();
                        setRunning(false);
                        setBusy(false);
                        onResult(result.getText());
                    }
                },
            );

            if (operation.current !== currentOperation || found) {
                scannerControls.stop();
            } else {
                controls.current = scannerControls;
                setRunning(true);
            }
        } catch (exception) {
            if (operation.current === currentOperation) {
                setError(
                    exception instanceof DOMException &&
                        exception.name === 'NotAllowedError'
                        ? 'Camera permission was denied. Allow camera access in browser settings or upload a code image.'
                        : 'Could not start the camera. Check that a camera is connected and not in use, or upload a code image.',
                );
            }
        } finally {
            if (operation.current === currentOperation) {
                setBusy(false);
            }
        }
    }

    async function scanImage(file: File) {
        stop();
        setError('');

        if (
            !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
            file.size > 5 * 1024 * 1024
        ) {
            setError('Choose a PNG, JPG, or WebP image up to 5 MB.');

            return;
        }

        const currentOperation = operation.current;
        const url = URL.createObjectURL(file);
        setBusy(true);

        try {
            const { BrowserMultiFormatReader } = await import('@zxing/browser');
            const result =
                await new BrowserMultiFormatReader().decodeFromImageUrl(url);

            if (operation.current === currentOperation) {
                setBusy(false);
                onResult(result.getText());
            }
        } catch {
            if (operation.current === currentOperation) {
                setError(
                    'No readable QR code or barcode was found. Use a clear image showing the whole code.',
                );
            }
        } finally {
            URL.revokeObjectURL(url);

            if (operation.current === currentOperation) {
                setBusy(false);
            }
        }
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(value) => {
                if (!value) {
                    stop();
                }

                onOpenChange(value);
            }}
        >
            <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Scan QR / Barcode</DialogTitle>
                    <DialogDescription>
                        Scan a single-use login code generated from your
                        signed-in student account to sign in automatically.
                        Printed ID or COR numbers still require your password.
                    </DialogDescription>
                </DialogHeader>
                <video
                    ref={video}
                    autoPlay
                    muted
                    playsInline
                    aria-label="QR and barcode camera preview"
                    className="aspect-video w-full rounded-xl bg-black object-contain"
                />
                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        onClick={() => void start()}
                        disabled={busy || running}
                    >
                        {busy ? <Spinner /> : <Camera className="size-4" />}{' '}
                        Start camera
                    </Button>
                    {running && (
                        <Button type="button" variant="outline" onClick={stop}>
                            <CameraOff className="size-4" /> Stop camera
                        </Button>
                    )}
                </div>
                <label className="grid gap-2 text-sm font-medium">
                    <span className="flex items-center gap-2">
                        <ImagePlus className="size-4" /> Or upload a QR /
                        barcode image
                    </span>
                    <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        disabled={busy}
                        onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = '';

                            if (file) {
                                void scanImage(file);
                            }
                        }}
                        className="block w-full rounded-lg border p-2 text-sm"
                    />
                </label>
                {error && (
                    <p role="alert" className="text-sm text-destructive">
                        {error}
                    </p>
                )}
            </DialogContent>
        </Dialog>
    );
}
