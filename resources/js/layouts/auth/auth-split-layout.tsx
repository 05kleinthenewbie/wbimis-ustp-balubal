import { Link } from '@inertiajs/react';
import ustpLogo from '@/assets/ustp-logo.png';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            <div className="relative hidden flex-col justify-between overflow-hidden bg-ustp-navy-dark p-11 lg:flex">
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.06]"
                    style={{
                        backgroundImage:
                            'radial-gradient(circle, #FAC775 1.5px, transparent 1.5px)',
                        backgroundSize: '26px 26px',
                    }}
                />

                <Link
                    href={home()}
                    className="relative z-10 flex items-center gap-2.5"
                >
                    <div className="flex size-9 items-center justify-center rounded-full bg-white text-sm font-medium text-ustp-navy">
                        <img
                            src={ustpLogo}
                            alt="USTP Logo"
                            className="size-full rounded-full object-contain p-0.5"
                        />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-white">
                            USTP Balubal ICT Portal
                        </p>
                        <p className="text-xs text-blue-200">Balubal Campus</p>
                    </div>
                </Link>

                <div className="relative z-10">
                    <div className="mb-4 h-0.75 w-9 bg-ustp-gold" />
                    <h1 className="mb-3 text-2xl leading-tight font-medium text-white uppercase">
                        A Web-Based ICT Management and Information System for
                        USTP Balubal
                    </h1>
                    <p className="text-sm leading-relaxed text-blue-200">
                        Submit requests, track job orders, book facilities, and
                        report incidents — all in one place.
                    </p>
                </div>

                <div className="relative z-10 flex gap-6">
                    <div>
                        <p className="text-xl font-medium text-ustp-gold">5</p>
                        <p className="text-xs text-blue-200">Core modules</p>
                    </div>
                    <div>
                        <p className="text-xl font-medium text-ustp-gold">
                            24/7
                        </p>
                        <p className="text-xs text-blue-200">
                            Request tracking
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col justify-center p-6 lg:p-11">
                <div className="mx-auto w-full max-w-sm">
                    <Link
                        href={home()}
                        className="mb-8 flex items-center justify-center gap-2 lg:hidden"
                    >
                        <div className="flex size-10 items-center justify-center rounded-full bg-white shadow-sm">
                            <img
                                src={ustpLogo}
                                alt="USTP Logo"
                                className="size-full rounded-full object-contain p-1"
                            />
                        </div>
                    </Link>

                    <div className="mb-6 space-y-1 text-left">
                        <h2 className="text-xl font-medium">{title}</h2>
                        <p className="text-sm text-muted-foreground">
                            {description}
                        </p>
                    </div>

                    {children}
                </div>
            </div>
        </div>
    );
}
