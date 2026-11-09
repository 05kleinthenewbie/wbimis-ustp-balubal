import { Form, Head, Link } from '@inertiajs/react';
import {
    document,
    sendEmail,
    store,
} from '@/actions/App/Http/Controllers/StudentVerificationController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { dashboard, logout } from '@/routes';

type Application = {
    id: number;
    name: string;
    email: string;
    email_verified: boolean;
    approval_status: 'pending' | 'approved' | 'rejected';
    review_notes: string | null;
    submitted_at: string | null;
    has_student_id: boolean;
    has_cor: boolean;
};

export default function Verification({
    application,
    status,
}: {
    application: Application;
    status?: string;
}) {
    const statusLabels: Record<string, string> = {
        pending: 'Awaiting administrator review',
        approved: 'Your account has been approved',
        rejected: 'Your application was rejected',
    };

    return (
        <main className="min-h-screen bg-background p-6 text-foreground">
            <Head title="Student verification" />
            <div className="mx-auto grid max-w-3xl gap-6">
                <header className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold">
                            Student verification
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {application.name} ·{' '}
                            {statusLabels[application.approval_status]}
                        </p>
                    </div>
                    <Link href={logout()} as="button">
                        Sign out
                    </Link>
                </header>
                {status && (
                    <p role="status" className="rounded-lg border p-4">
                        {status}
                    </p>
                )}

                {!application.email_verified && (
                    <section className="rounded-xl border p-6">
                        <h2 className="mb-2 text-lg font-semibold">
                            Verify your email
                        </h2>
                        <p className="mb-3 text-sm text-muted-foreground">
                            Verifying your email proves email ownership for the
                            ICT office reviewing your application.
                        </p>
                        <Form {...sendEmail.form()}>
                            {({ processing, errors }) => (
                                <>
                                    <Button disabled={processing}>
                                        Send verification email
                                    </Button>
                                    <InputError message={errors.email} />
                                </>
                            )}
                        </Form>
                    </section>
                )}

                <section className="rounded-xl border p-6">
                    <h2 className="text-lg font-semibold">
                        Uploaded documents
                    </h2>
                    <p className="mb-3 text-sm text-muted-foreground">
                        {application.submitted_at
                            ? `Last submitted ${new Date(application.submitted_at).toLocaleString()}`
                            : 'No documents have been submitted yet.'}
                    </p>
                    <div className="flex gap-4 text-sm">
                        {application.has_student_id && (
                            <a
                                href={document.url('student_id')}
                                target="_blank"
                                rel="noreferrer"
                                className="underline"
                            >
                                View student ID
                            </a>
                        )}
                        {application.has_cor && (
                            <a
                                href={document.url('cor')}
                                target="_blank"
                                rel="noreferrer"
                                className="underline"
                            >
                                View COR
                            </a>
                        )}
                    </div>
                </section>

                {application.approval_status === 'approved' ? (
                    <Link href={dashboard()}>Continue to dashboard</Link>
                ) : (
                    <section className="grid gap-4 rounded-xl border p-6">
                        <h2 className="text-xl font-semibold">
                            {application.submitted_at
                                ? 'Replace your documents'
                                : 'Upload your documents'}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Provide your Certificate of Registration (COR) as a
                            PDF, PNG, or JPEG (up to 15 MB) and, optionally, a
                            clear USTP student ID image (PNG, JPEG or WebP, up
                            to 8 MB). Submitting replaces the previous documents
                            and returns the application to pending review.
                        </p>
                        <Form
                            {...store.form()}
                            className="grid gap-4"
                            resetOnSuccess
                        >
                            {({ processing, errors, progress }) => (
                                <>
                                    <div className="grid gap-2">
                                        <Label htmlFor="cor">
                                            Certificate of Registration (PDF or
                                            image)
                                        </Label>
                                        <Input
                                            id="cor"
                                            name="cor"
                                            type="file"
                                            accept="application/pdf,image/png,image/jpeg,image/webp"
                                        />
                                        <InputError message={errors.cor} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="student_id">
                                            USTP student ID image (optional)
                                        </Label>
                                        <Input
                                            id="student_id"
                                            name="student_id"
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                        />
                                        <InputError
                                            message={errors.student_id}
                                        />
                                    </div>
                                    {progress && (
                                        <progress
                                            value={progress.percentage}
                                            max={100}
                                        />
                                    )}
                                    <Button disabled={processing}>
                                        {processing
                                            ? 'Storing documents…'
                                            : 'Submit for review'}
                                    </Button>
                                </>
                            )}
                        </Form>
                    </section>
                )}

                {application.review_notes && (
                    <section className="rounded-xl border p-6">
                        <h2 className="mb-2 font-medium">
                            Administrator feedback
                        </h2>
                        <p className="text-sm whitespace-pre-wrap">
                            {application.review_notes}
                        </p>
                    </section>
                )}
            </div>
        </main>
    );
}
