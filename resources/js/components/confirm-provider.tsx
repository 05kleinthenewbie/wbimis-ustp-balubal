import { AlertTriangle } from 'lucide-react';
import {
    createContext,
    useCallback,
    useContext,
    useRef,
    useState,
} from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export type ConfirmOptions = {
    title?: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
};

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
    const [options, setOptions] = useState<ConfirmOptions | null>(null);
    const resolver = useRef<((confirmed: boolean) => void) | null>(null);

    const confirm = useCallback<ConfirmFn>((nextOptions) => {
        resolver.current?.(false);

        setOptions(nextOptions);

        return new Promise<boolean>((resolve) => {
            resolver.current = resolve;
        });
    }, []);

    function settle(confirmed: boolean) {
        const resolve = resolver.current;

        resolver.current = null;
        setOptions(null);
        resolve?.(confirmed);
    }

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}

            <Dialog
                open={options !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        settle(false);
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {options?.destructive && (
                                <AlertTriangle className="size-4 text-amber-600" />
                            )}
                            {options?.title ?? 'Please confirm'}
                        </DialogTitle>

                        <DialogDescription>
                            {options?.description}
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => settle(false)}
                        >
                            {options?.cancelLabel ?? 'Cancel'}
                        </Button>

                        <Button
                            type="button"
                            variant={
                                options?.destructive ? 'destructive' : 'default'
                            }
                            onClick={() => settle(true)}
                        >
                            {options?.confirmLabel ?? 'Confirm'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </ConfirmContext.Provider>
    );
}

export function useConfirm(): ConfirmFn {
    const context = useContext(ConfirmContext);

    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmProvider.');
    }

    return context;
}
