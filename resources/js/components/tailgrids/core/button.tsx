import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap transition-all outline-none focus-visible:ring-2 focus-visible:ring-ustp-gold focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
    {
        variants: {
            variant: {
                primary:
                    'bg-ustp-navy text-white shadow-md shadow-ustp-navy/20 hover:-translate-y-0.5 hover:bg-ustp-navy-dark hover:shadow-lg hover:shadow-ustp-navy/30',
                secondary:
                    'bg-ustp-gold text-ustp-navy shadow-md shadow-ustp-gold/30 hover:-translate-y-0.5 hover:bg-ustp-gold-dark hover:text-white hover:shadow-lg hover:shadow-ustp-gold/40',
                outline:
                    'border border-border bg-transparent text-ustp-navy hover:bg-ustp-gray/60 dark:text-white dark:hover:bg-neutral-800',
                ghost: 'text-ustp-navy hover:bg-ustp-gray/60 dark:text-white dark:hover:bg-neutral-800',
            },
            size: {
                sm: 'h-9 px-3 text-xs [&_svg]:size-4',
                md: 'h-10 px-4 text-sm [&_svg]:size-4',
                lg: 'h-11 px-6 text-sm [&_svg]:size-4.5',
            },
        },
        defaultVariants: {
            variant: 'primary',
            size: 'md',
        },
    },
);

function Button({
    className,
    variant,
    size,
    asChild = false,
    ...props
}: ComponentProps<'button'> &
    VariantProps<typeof buttonVariants> & {
        asChild?: boolean;
    }) {
    const Comp = asChild ? Slot : 'button';

    return (
        <Comp
            data-slot="button"
            className={cn(buttonVariants({ variant, size, className }))}
            {...props}
        />
    );
}

export { Button, buttonVariants };
