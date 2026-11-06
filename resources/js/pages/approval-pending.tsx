import { Head, Link, router, usePage } from '@inertiajs/react';
import { Clock3, LogOut, School } from 'lucide-react';
import type { User } from '@/types';

type Props = {
    auth: { user: User };
};

export default function ApprovalPending() {
    const { auth } = usePage().props as Props;
    const user = auth.user;

    return (
        <>
            <Head title="Pending Approval" />

            <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-slate-800">
                <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
                    <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                        <Clock3 className="size-7" />
                    </div>

                    <h1 className="text-lg font-semibold">
                        Your account is pending administrator approval.
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-slate-500">
                        Your registration was successful and your email address{' '}
                        <span className="font-medium text-slate-700">
                            {user.email}
                        </span>{' '}
                        has been verified. An ICT administrator will review your
                        account shortly. Once it is approved, you can access the
                        application with your same email and password.
                    </p>

                    <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-500">
                        You already have a pending approval status. Do not
                        register again with this email address.
                    </p>

                    <div className="mt-6 flex items-center justify-center gap-3">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
                        >
                            <School className="size-3.5" />
                            Back to Home
                        </Link>

                        <button
                            type="button"
                            onClick={() => router.post('/logout')}
                            className="inline-flex items-center gap-2 rounded-lg bg-ustp-navy px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-ustp-navy/90"
                        >
                            <LogOut className="size-3.5" />
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
