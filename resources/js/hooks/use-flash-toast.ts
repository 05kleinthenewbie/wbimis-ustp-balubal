import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import type { FlashToast } from '@/types/ui';

type FlashData = {
    status?: string | null;
    error?: string | null;
};

export function useFlashToast(): void {
    useEffect(() => {
        const offFlash = router.on('flash', (event) => {
            const data = (event as CustomEvent).detail?.flash?.toast as
                FlashToast | undefined;

            if (!data) {
                return;
            }

            toast[data.type](data.message);
        });

        const offSuccess = router.on('success', (event) => {
            const flash = (event as CustomEvent).detail?.page?.props?.flash as
                FlashData | undefined;

            if (flash?.status) {
                toast.success(flash.status);
            }

            if (flash?.error) {
                toast.error(flash.error);
            }
        });

        return () => {
            offFlash();
            offSuccess();
        };
    }, []);
}
