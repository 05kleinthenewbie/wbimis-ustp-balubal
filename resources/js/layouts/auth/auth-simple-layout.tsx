import { Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import ustpLogo from '@/assets/ustp-logo.png';
import { Button } from '@/components/ui/button';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
    wide = false,
    backTestId,
    hideBack = false,
}: AuthLayoutProps) {
    return (
        <div
            className="relative flex min-h-svh items-start justify-center px-2 py-3 sm:items-center sm:px-6 sm:py-12"
            style={{
                backgroundImage: "url('/images/ustp-building.jpg')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
            }}
        >
            {/* Dark overlay for readability */}
            <div className="pointer-events-none absolute inset-0 bg-ustp-navy/60 backdrop-blur-[2px]" />
            <div
                className={`relative z-10 w-full min-w-0 overflow-hidden rounded-2xl border border-border bg-background shadow-xl shadow-ustp-navy/5 sm:rounded-3xl ${
                    wide ? 'max-w-2xl' : 'max-w-lg'
                }`}
            >
                {/* Brand header */}
                <div className="flex flex-col items-center justify-center gap-4 bg-ustp-navy px-5 py-7 text-center sm:px-8 sm:py-8">
                    <Link
                        href={home()}
                        className="shrink-0 rounded-xl focus-visible:ring-2 focus-visible:ring-ustp-gold focus-visible:outline-none"
                        aria-label="USTP BALUBAL ICT PORTAL home"
                    >
                        <div className="flex size-12 items-center justify-center rounded-xl border border-slate-100 bg-white p-1.5 shadow-sm sm:size-14">
                            <img
                                src={ustpLogo}
                                alt="USTP Logo"
                                className="size-full object-contain"
                            />
                        </div>
                    </Link>
                    <div className="w-full min-w-0 space-y-3 text-center">
                        <h1 className="font-serif text-xl leading-tight font-bold tracking-tight text-balance text-white sm:text-2xl">
                            USTP BALUBAL ICT PORTAL
                        </h1>
                        <p className="mx-auto max-w-md font-serif text-xs leading-relaxed font-semibold text-white/80 sm:text-sm">
                            University of Science and Technology of Southern
                            Philippines
                        </p>
                    </div>
                </div>

                {/* Gold accent divider */}
                <div className="h-1 bg-ustp-gold" />

                <div className="bg-background px-4 py-5 sm:px-8 sm:py-8 [@media(max-width:639px)]:[&_input:not([type=checkbox]):not([type=hidden]):not([type=file])]:text-base [@media(max-width:639px)]:[&_input[type=date]]:min-w-0">
                    {!hideBack && (
                        <div className="mb-2 flex sm:mb-4">
                            <Button
                                asChild
                                variant="ghost"
                                size="sm"
                                className="-ml-2 h-10 gap-2 px-3 text-sm font-medium text-muted-foreground hover:text-ustp-navy dark:hover:text-white"
                            >
                                <Link
                                    href={home()}
                                    data-test={backTestId ?? 'auth-back-home'}
                                >
                                    <ArrowLeft className="size-5" />
                                    Back to Home
                                </Link>
                            </Button>
                        </div>
                    )}

                    <div className="mb-6 space-y-2 text-center sm:mb-8">
                        <h2 className="text-2xl leading-tight font-semibold tracking-tight text-balance text-foreground sm:text-[28px]">
                            {title}
                        </h2>
                        {description && (
                            <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground">
                                {description}
                            </p>
                        )}
                    </div>

                    {children}
                </div>
            </div>
        </div>
    );
}
