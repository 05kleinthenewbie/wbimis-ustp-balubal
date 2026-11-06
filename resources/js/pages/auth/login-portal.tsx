import { Head, Link } from '@inertiajs/react';
import { GraduationCap, Shield, Users } from 'lucide-react';
import StatusAlert from '@/components/status-alert';
import { login as adminLogin } from '@/routes/admin';
import { login as facultyLogin } from '@/routes/faculty';
import { login as studentLogin } from '@/routes/student';

type Props = {
    status?: string;
};

type PortalOption = {
    title: string;
    description: string;
    icon: typeof Users;
    iconClassName: string;
    href: string;
    dataTest: string;
};

const options: PortalOption[] = [
    {
        title: 'Faculty',
        description: 'Sign in with your faculty credentials.',
        icon: Users,
        iconClassName:
            'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400',
        href: facultyLogin().url,
        dataTest: 'portal-faculty-login-button',
    },
    {
        title: 'ICT Administrator',
        description: 'Authorized ICT personnel.',
        icon: Shield,
        iconClassName:
            'bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400',
        href: adminLogin().url,
        dataTest: 'portal-admin-login-button',
    },
    {
        title: 'Student',
        description: 'Sign in with your email address.',
        icon: GraduationCap,
        iconClassName:
            'bg-green-100 text-green-600 dark:bg-green-950/60 dark:text-green-400',
        href: studentLogin().url,
        dataTest: 'portal-student-login-button',
    },
];

export default function LoginPortal({ status }: Props) {
    return (
        <>
            <Head title="Select Portal" />

            {status && (
                <div className="mb-5">
                    <StatusAlert message={status} />
                </div>
            )}

            <div className="grid gap-5 py-2 sm:gap-6">
                {options.map((option) => {
                    const Icon = option.icon;

                    return (
                        <Link
                            key={option.title}
                            href={option.href}
                            data-test={option.dataTest}
                            className="group flex min-w-0 flex-col items-center gap-5 rounded-2xl border border-border bg-background px-5 py-6 text-center transition-colors hover:border-ustp-gold hover:bg-ustp-gold/5 focus-visible:ring-2 focus-visible:ring-ustp-gold focus-visible:ring-offset-2 focus-visible:outline-none sm:px-6 sm:py-7"
                        >
                            <div
                                className={`flex size-14 shrink-0 items-center justify-center rounded-2xl sm:size-16 ${option.iconClassName}`}
                            >
                                <Icon className="size-7 sm:size-8" />
                            </div>

                            <div className="min-w-0 space-y-2">
                                <h3 className="text-lg leading-snug font-semibold text-foreground sm:text-xl">
                                    {option.title}
                                </h3>

                                <p className="text-base leading-relaxed text-muted-foreground">
                                    {option.description}
                                </p>
                            </div>
                            <span className="sr-only">Sign in</span>
                        </Link>
                    );
                })}
            </div>
        </>
    );
}

LoginPortal.layout = {
    wide: false,
    title: 'Choose your portal',
};
